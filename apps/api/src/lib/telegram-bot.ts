import type { FastifyBaseLogger } from 'fastify';
import { prisma } from './prisma.js';
import { botApi, isBotConfigured, sendTelegramMessage } from './telegram-api.js';
import { confirmLoginNonce, failLoginNonce, peekLoginNonce, type TgUser } from './telegram-login.js';
import { getConfig, updateConfig } from '../modules/config/service.js';

/**
 * In-process long-polling bot (mirrors the stats worker: one API container, no
 * webhook/nginx wiring, dev == prod). Handles two update kinds:
 *  - /start <nonce> in private chats — confirms deep-link login/link nonces;
 *  - my_chat_member — captures/clears the notification group chat id when the
 *    bot is added to or removed from a group.
 * Not started at all when TELEGRAM_BOT_TOKEN is unset (dev uses dev-confirm).
 */

interface TgUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; is_bot?: boolean; first_name?: string; last_name?: string; username?: string };
    migrate_to_chat_id?: number;
  };
  my_chat_member?: {
    chat: { id: number; type: string; title?: string };
    new_chat_member: { status: string; user: { id: number; is_bot: boolean } };
  };
}

const GREETING =
  'Здравствуйте! Это бот EasyGo: вход на сайт и уведомления о бронированиях. ' +
  'Чтобы войти, нажмите «Войти через Telegram» на сайте.';

export function startTelegramBot(log: FastifyBaseLogger): { stop(): Promise<void> } | null {
  if (!isBotConfigured()) {
    log.info('telegram bot: no TELEGRAM_BOT_TOKEN, polling disabled');
    return null;
  }

  const abort = new AbortController();
  let running = true;

  const loop = (async () => {
    // Defensive: a leftover webhook blocks getUpdates.
    await botApi('deleteWebhook', {}).catch((err) => log.warn({ err }, 'telegram deleteWebhook failed'));

    let offset = 0;
    let backoff = 1000;
    while (running) {
      try {
        const updates = await botApi<TgUpdate[]>(
          'getUpdates',
          { offset, timeout: 50, allowed_updates: ['message', 'my_chat_member'] },
          abort.signal,
        );
        backoff = 1000;
        for (const update of updates) {
          offset = update.update_id + 1;
          try {
            await handleUpdate(update);
          } catch (err) {
            log.error({ err, updateId: update.update_id }, 'telegram update handling failed');
          }
        }
      } catch (err) {
        if (!running) break;
        // Covers network errors and 409 (another poller during a redeploy).
        log.warn({ err }, `telegram poll error, retrying in ${backoff}ms`);
        await sleep(backoff, abort.signal);
        backoff = Math.min(backoff * 2, 30_000);
      }
    }
  })();

  log.info('telegram bot polling started');
  return {
    async stop() {
      running = false;
      abort.abort();
      await loop.catch(() => undefined);
    },
  };
}

async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.message) await handleMessage(update.message);
  if (update.my_chat_member) await handleMyChatMember(update.my_chat_member);
}

async function handleMessage(msg: NonNullable<TgUpdate['message']>): Promise<void> {
  // Group upgraded to supergroup — keep the saved notify chat id current.
  if (msg.migrate_to_chat_id) {
    const config = await getConfig();
    if (config.telegramNotifyChatId === String(msg.chat.id)) {
      await updateConfig({ telegramNotifyChatId: String(msg.migrate_to_chat_id) });
    }
    return;
  }

  if (msg.chat.type !== 'private' || !msg.text || !msg.from) return;
  const match = /^\/start(?:\s+([\w-]+))?\s*$/.exec(msg.text);
  if (!match) return;

  const chatId = msg.chat.id;
  const nonce = match[1];
  if (!nonce) {
    await sendTelegramMessage(chatId, GREETING);
    return;
  }

  const record = await peekLoginNonce(nonce);
  if (!record || record.status !== 'pending') {
    await sendTelegramMessage(chatId, 'Ссылка устарела. Запросите вход заново на сайте.');
    return;
  }

  const tg: TgUser = {
    id: String(msg.from.id),
    firstName: msg.from.first_name ?? 'Клиент',
    lastName: msg.from.last_name,
    username: msg.from.username,
  };

  switch (record.aud) {
    case 'client-login': {
      await confirmLoginNonce(nonce, tg);
      await sendTelegramMessage(chatId, 'Готово! Вернитесь на сайт EasyGo — вход выполнится автоматически.');
      return;
    }
    case 'admin-login': {
      const user = await prisma.user.findUnique({ where: { telegramId: tg.id } });
      if (!user) {
        await failLoginNonce(nonce, 'Этот Telegram-аккаунт не привязан к сотруднику');
        await sendTelegramMessage(
          chatId,
          'Этот Telegram-аккаунт не привязан к сотруднику EasyGo. ' +
            'Войдите в админ-панель по паролю и привяжите Telegram в разделе «Настройки».',
        );
        return;
      }
      await confirmLoginNonce(nonce, tg);
      await sendTelegramMessage(chatId, 'Готово! Вернитесь в админ-панель EasyGo.');
      return;
    }
    case 'admin-link': {
      const taken = await prisma.user.findUnique({ where: { telegramId: tg.id } });
      if (taken && taken.id !== record.userId) {
        await failLoginNonce(nonce, 'Этот Telegram уже привязан к другому аккаунту');
        await sendTelegramMessage(chatId, 'Этот Telegram уже привязан к другому аккаунту EasyGo.');
        return;
      }
      await confirmLoginNonce(nonce, tg);
      await sendTelegramMessage(chatId, 'Telegram привязан. Вернитесь в админ-панель EasyGo.');
      return;
    }
  }
}

async function handleMyChatMember(upd: NonNullable<TgUpdate['my_chat_member']>): Promise<void> {
  const { chat, new_chat_member: member } = upd;
  if (chat.type !== 'group' && chat.type !== 'supergroup') return;

  if (member.status === 'member' || member.status === 'administrator') {
    await updateConfig({ telegramNotifyChatId: String(chat.id) });
    await sendTelegramMessage(chat.id, 'Готово! Уведомления о новых бронированиях будут приходить в этот чат.');
  } else if (member.status === 'left' || member.status === 'kicked') {
    const config = await getConfig();
    if (config.telegramNotifyChatId === String(chat.id)) {
      await updateConfig({ telegramNotifyChatId: null });
    }
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
