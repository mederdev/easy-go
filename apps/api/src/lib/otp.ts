import { randomInt } from 'node:crypto';
import { makeRedis } from './queue.js';
import { isProd } from '../env.js';
import { AppError } from './errors.js';

/**
 * Phone OTP backed by Redis (no DB migration). A 6-digit code is stored under
 * `otp:<phone>` with a short TTL; verification is attempt-limited. Delivery is a
 * dev stub for now — swap `sendOtp` for a real SMS / WhatsApp Business provider.
 */
const redis = makeRedis();

const TTL_SECONDS = 300; // code lifetime: 5 min
const RESEND_COOLDOWN = 30; // min seconds between requests per phone
const MAX_ATTEMPTS = 5;

const codeKey = (phone: string) => `otp:${phone}`;
const attemptsKey = (phone: string) => `otp:att:${phone}`;
const cooldownKey = (phone: string) => `otp:cool:${phone}`;

/** Dev stub: logs the code. Production: send via SMS / WhatsApp. */
async function sendOtp(phone: string, code: string): Promise<void> {
  if (!isProd) {
    // eslint-disable-next-line no-console
    console.info(`[otp] ${phone} → ${code}`);
  }
  // TODO: integrate a real provider for production delivery.
}

export async function issueOtp(phone: string): Promise<{ code: string; expiresIn: number }> {
  if (await redis.exists(cooldownKey(phone))) {
    throw new AppError(429, 'OTP_COOLDOWN', 'Подождите перед повторной отправкой кода');
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await redis.set(codeKey(phone), code, 'EX', TTL_SECONDS);
  await redis.del(attemptsKey(phone));
  await redis.set(cooldownKey(phone), '1', 'EX', RESEND_COOLDOWN);
  await sendOtp(phone, code);
  return { code, expiresIn: TTL_SECONDS };
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const stored = await redis.get(codeKey(phone));
  if (!stored) throw new AppError(400, 'OTP_EXPIRED', 'Код истёк или не запрашивался');

  const attempts = await redis.incr(attemptsKey(phone));
  await redis.expire(attemptsKey(phone), TTL_SECONDS);
  if (attempts > MAX_ATTEMPTS) {
    await redis.del(codeKey(phone));
    throw new AppError(429, 'OTP_TOO_MANY', 'Слишком много попыток, запросите новый код');
  }

  if (stored !== code) throw new AppError(400, 'OTP_INVALID', 'Неверный код');

  await redis.del(codeKey(phone), attemptsKey(phone));
}
