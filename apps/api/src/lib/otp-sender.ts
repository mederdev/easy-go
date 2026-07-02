import { randomBytes } from 'node:crypto';
import { AppError } from './errors.js';
import { prisma } from './prisma.js';
import { env, isProd } from '../env.js';
import { isBotConfigured, sendTelegramMessage } from './telegram-api.js';

/**
 * OTP delivery chain (WhatsApp dropped by design — customers are in KG/KZ/UZ):
 *  1. The phone belongs to a client or staff user with a linked Telegram
 *     (they've started the bot) → free bot DM.
 *  2. Kyrgyz numbers (+996) → Nikita KG SMS gateway (smspro.nikita.kg).
 *  3. Otherwise a clear Russian error steering the user to bot login.
 *     KZ/UZ SMS providers plug in behind this same seam later.
 * Outside production with nothing configured, the code is console-logged so it
 * can be read from the API logs (and the API returns devCode to the UI).
 */
export async function sendOtpCode(phone: string, code: string): Promise<void> {
  const text = `EasyGo: ваш код для входа — ${code}. Никому его не сообщайте.`;

  // 1. Linked Telegram → free DM through the bot.
  if (isBotConfigured()) {
    const telegramId = await findTelegramIdByPhone(phone);
    if (telegramId) {
      try {
        await sendTelegramMessage(telegramId, text);
        return;
      } catch {
        // User blocked the bot / deleted the chat — fall through to SMS.
      }
    }
  }

  // 2. Kyrgyz numbers → Nikita SMS.
  if (phone.startsWith('+996') && env.NIKITA_LOGIN && env.NIKITA_PASSWORD) {
    await sendNikitaSms(phone, text);
    return;
  }

  // 3. Dev fallback: keep the flow testable without any provider.
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.info(`[OTP mock] → ${phone}: ${text}`);
    return;
  }

  throw new AppError(
    400,
    'OTP_UNDELIVERABLE',
    'Не удалось отправить код на этот номер. Войдите через Telegram.',
  );
}

/** Linked Telegram for this phone — customer first, then back-office staff. */
async function findTelegramIdByPhone(phone: string): Promise<string | null> {
  const client = await prisma.client.findUnique({ where: { phone }, select: { telegramId: true } });
  if (client?.telegramId) return client.telegramId;
  const user = await prisma.user.findUnique({ where: { phone }, select: { telegramId: true } });
  return user?.telegramId ?? null;
}

/**
 * Nikita KG gateway: XML POST to /api/message with login/pwd auth
 * (https://smspro.nikita.kg — see their OTP API doc). Status "0" = accepted;
 * anything else is an error code from the gateway.
 */
async function sendNikitaSms(phone: string, text: string): Promise<void> {
  const id = randomBytes(6).toString('hex'); // gateway-side dedupe id, ≤20 chars
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<message>` +
    `<login>${escapeXml(env.NIKITA_LOGIN!)}</login>` +
    `<pwd>${escapeXml(env.NIKITA_PASSWORD!)}</pwd>` +
    `<id>${id}</id>` +
    `<sender>${escapeXml(env.NIKITA_SENDER ?? 'EasyGo')}</sender>` +
    `<text>${escapeXml(text)}</text>` +
    `<phones><phone>${phone.replace(/^\+/, '')}</phone></phones>` +
    `</message>`;

  const res = await fetch('https://smspro.nikita.kg/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
    body: xml,
  });
  const body = await res.text();
  const status = /<status>(\d+)<\/status>/.exec(body)?.[1];
  if (!res.ok || status !== '0') {
    // eslint-disable-next-line no-console
    console.error(`[Nikita SMS] send failed (http ${res.status}, status ${status ?? '?'})`);
    throw new AppError(502, 'OTP_SEND_FAILED', 'Не удалось отправить код, попробуйте ещё раз');
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
