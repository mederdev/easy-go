import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { TelegramLoginInput } from '@easygo/shared';
import { env, isProd } from '../env.js';
import { Errors } from './errors.js';

/** Reject widget payloads older than 24h. */
const AUTH_TTL_SECONDS = 86400;

/**
 * Verify a Telegram Login Widget payload
 * (https://core.telegram.org/widgets/login#checking-authorization).
 *
 * Builds the data-check-string — every field except `hash`, as `key=value`,
 * sorted by key, joined with "\n" — keys the HMAC-SHA256 with SHA256(botToken),
 * and compares it to `hash`. Also rejects stale payloads.
 *
 * Dev-bypass: outside production, when no bot token is configured, verification
 * is skipped so the flow can be exercised locally without a real bot/domain
 * (mirrors the OTP console stub in `lib/otp.ts`).
 */
export function verifyTelegramAuth(payload: TelegramLoginInput): void {
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    if (!isProd) return; // dev-bypass — accept unverified payloads in dev
    throw Errors.unauthorized('Telegram авторизация не настроена');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - payload.auth_date > AUTH_TTL_SECONDS) {
    throw Errors.unauthorized('Срок действия Telegram-авторизации истёк');
  }

  const { hash, ...fields } = payload;
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${(fields as Record<string, unknown>)[key]}`)
    .join('\n');

  const secret = createHash('sha256').update(token).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest('hex');

  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw Errors.unauthorized('Неверная подпись Telegram');
  }
}
