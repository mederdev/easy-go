import { env } from '../env.js';

/**
 * Minimal Telegram Bot API client (no SDK dependency — we only need a handful
 * of methods: getUpdates / sendMessage / deleteWebhook). Used by the deep-link
 * login bot and booking notifications.
 */

export function isBotConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN);
}

export class TelegramApiError extends Error {
  constructor(
    public method: string,
    public errorCode: number,
    description: string,
  ) {
    super(`Telegram ${method} failed (${errorCode}): ${description}`);
    this.name = 'TelegramApiError';
  }
}

export async function botApi<T>(
  method: string,
  payload?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
    signal,
  });
  const data = (await res.json()) as {
    ok: boolean;
    result?: T;
    error_code?: number;
    description?: string;
  };
  if (!data.ok) throw new TelegramApiError(method, data.error_code ?? res.status, data.description ?? 'unknown');
  return data.result as T;
}

/**
 * Send an HTML-formatted message. Without a configured bot the message is
 * console-logged instead, so dev flows stay observable.
 */
export async function sendTelegramMessage(chatId: string | number, html: string): Promise<void> {
  if (!isBotConfigured()) {
    // eslint-disable-next-line no-console
    console.info(`[TG mock] → ${chatId}: ${html}`);
    return;
  }
  await botApi('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML' });
}

/** Escape user-supplied text before embedding into parse_mode:'HTML' messages. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
