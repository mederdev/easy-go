import { randomInt } from 'node:crypto';
import { makeRedis } from './queue.js';
import { AppError } from './errors.js';
import { sendOtpCode } from './otp-sender.js';

/**
 * Phone OTP backed by Redis (no DB migration). A 6-digit code is stored under
 * `otp:<phone>` with a short TTL; verification is attempt-limited. Delivery
 * goes through the chain in `otp-sender.ts` (Telegram bot DM → Nikita SMS).
 */
const redis = makeRedis();

const TTL_SECONDS = 300; // code lifetime: 5 min
const RESEND_COOLDOWN = 30; // min seconds between requests per phone
const MAX_ATTEMPTS = 5;

const codeKey = (phone: string) => `otp:${phone}`;
const attemptsKey = (phone: string) => `otp:att:${phone}`;
const cooldownKey = (phone: string) => `otp:cool:${phone}`;

export async function issueOtp(phone: string): Promise<{ code: string; expiresIn: number }> {
  if (await redis.exists(cooldownKey(phone))) {
    throw new AppError(429, 'OTP_COOLDOWN', 'Подождите перед повторной отправкой кода');
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await redis.set(codeKey(phone), code, 'EX', TTL_SECONDS);
  await redis.del(attemptsKey(phone));
  try {
    await sendOtpCode(phone, code);
  } catch (err) {
    // Failed delivery must not lock the user out: drop the code, skip cooldown.
    await redis.del(codeKey(phone));
    throw err;
  }
  await redis.set(cooldownKey(phone), '1', 'EX', RESEND_COOLDOWN);
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
