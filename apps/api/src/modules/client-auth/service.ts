import bcrypt from 'bcryptjs';
import type { Client } from '@prisma/client';
import type { ClientLoginInput, OtpVerifyInput, SetClientPasswordInput, TelegramLoginInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { issueOtp, verifyOtp } from '../../lib/otp.js';
import { verifyTelegramAuth } from '../../lib/telegram.js';
import { consumeLoginNonce, peekLoginNonce, type TgUser } from '../../lib/telegram-login.js';
import { isProd } from '../../env.js';

/** Issue + send an OTP. Returns the code in dev so the UI can auto-fill it. */
export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  const { code, expiresIn } = await issueOtp(phone);
  return { ok: true as const, expiresIn, ...(isProd ? {} : { devCode: code }) };
}

/** Verify the code and upsert the customer by phone (creating on first login). */
export async function verifyAndUpsertClient(input: OtpVerifyInput) {
  const phone = normalizePhone(input.phone);
  await verifyOtp(phone, input.code);
  return prisma.client.upsert({
    where: { phone },
    create: { phone, name: input.name?.trim() || 'Клиент', whatsapp: true },
    update: input.name ? { name: input.name.trim() } : {},
  });
}

/**
 * Verify a Telegram Login Widget payload and upsert the customer by telegramId.
 * New customers are created without a phone (asked for one later, at booking).
 */
export async function loginWithTelegram(input: TelegramLoginInput) {
  verifyTelegramAuth(input);
  const telegramId = String(input.id);
  const name = [input.first_name, input.last_name].filter(Boolean).join(' ').trim() || 'Клиент';

  const existing = await prisma.client.findUnique({ where: { telegramId } });
  if (existing) {
    // Keep the Telegram-sourced fields fresh; leave name/phone as the user set them.
    return prisma.client.update({
      where: { id: existing.id },
      data: { telegramUsername: input.username ?? null, photoUrl: input.photo_url ?? null },
    });
  }
  return prisma.client.create({
    data: {
      name,
      telegramId,
      telegramUsername: input.username ?? null,
      photoUrl: input.photo_url ?? null,
      whatsapp: true,
    },
  });
}

export type ClientTelegramPollResult =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'error'; message: string }
  | { status: 'confirmed'; client: Client };

/**
 * Poll a deep-link login nonce. Pending/error reads are non-destructive; a
 * confirmed nonce is consumed one-time and the customer is upserted by the
 * Telegram identity the bot captured (same rules as the widget login).
 */
export async function pollClientTelegramLogin(nonce: string): Promise<ClientTelegramPollResult> {
  const record = await peekLoginNonce(nonce);
  if (!record || record.aud !== 'client-login') return { status: 'expired' };
  if (record.status === 'pending') return { status: 'pending' };
  if (record.status === 'error') return { status: 'error', message: record.error ?? 'Ошибка входа' };

  const consumed = await consumeLoginNonce(nonce);
  if (!consumed || consumed.status !== 'confirmed' || !consumed.tg) return { status: 'expired' };
  return { status: 'confirmed', client: await upsertClientByTelegram(consumed.tg) };
}

async function upsertClientByTelegram(tg: TgUser): Promise<Client> {
  const existing = await prisma.client.findUnique({ where: { telegramId: tg.id } });
  if (existing) {
    // Keep the Telegram-sourced fields fresh; leave name/phone as the user set them.
    return prisma.client.update({
      where: { id: existing.id },
      data: { telegramUsername: tg.username ?? null },
    });
  }
  const name = [tg.firstName, tg.lastName].filter(Boolean).join(' ').trim() || 'Клиент';
  return prisma.client.create({
    data: { name, telegramId: tg.id, telegramUsername: tg.username ?? null, whatsapp: true },
  });
}

/** Login with phone + password (only works if client has set a password via /me/password). */
export async function loginWithPassword(input: ClientLoginInput) {
  const phone = normalizePhone(input.phone);
  const client = await prisma.client.findUnique({ where: { phone } });
  if (!client || !client.passwordHash) throw Errors.unauthorized('Неверный телефон или пароль');

  const ok = await bcrypt.compare(input.password, client.passwordHash);
  if (!ok) throw Errors.unauthorized('Неверный телефон или пароль');
  return client;
}

/** Set or update the client's password (called from /me/password when authenticated). */
export async function setClientPassword(clientId: string, input: SetClientPasswordInput) {
  const hash = await bcrypt.hash(input.password, 10);
  return prisma.client.update({
    where: { id: clientId },
    data: { passwordHash: hash, passwordRaw: input.password },
  });
}
