import bcrypt from 'bcryptjs';
import type { Client } from '@prisma/client';
import type { ClientLoginInput, ClientRegisterInput, SetClientPasswordInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { consumeLoginNonce, peekLoginNonce, type TgUser } from '../../lib/telegram-login.js';

/** Strip credential fields before a client row leaves the API. */
export function toClientView(client: Client): Omit<Client, 'passwordHash' | 'passwordRaw'> {
  const { passwordHash: _hash, passwordRaw: _raw, ...view } = client;
  return view;
}

/** Register with phone + name + password (the non-Telegram signup path). */
export async function registerClient(input: ClientRegisterInput): Promise<Client> {
  const phone = normalizePhone(input.phone);
  // Any existing client with this phone (even credential-less rows created by
  // bookings) blocks registration — the phone is the customer's identity.
  const existing = await prisma.client.findUnique({ where: { phone } });
  if (existing) {
    throw Errors.conflict('Этот номер уже зарегистрирован — войдите или восстановите пароль', 'PHONE_TAKEN');
  }
  try {
    return await prisma.client.create({
      data: {
        phone,
        name: input.name.trim(),
        // Self-set passwords are stored as a hash only (no passwordRaw).
        passwordHash: await bcrypt.hash(input.password, 10),
        whatsapp: true,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      throw Errors.conflict('Этот номер уже зарегистрирован — войдите или восстановите пароль', 'PHONE_TAKEN');
    }
    throw err;
  }
}

export type ClientTelegramPollResult =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'not_registered' }
  | { status: 'error'; message: string }
  | { status: 'confirmed'; client: Client };

/**
 * Poll a deep-link nonce. Pending/error reads are non-destructive; a confirmed
 * nonce is consumed one-time. A nonce carrying a registration payload (`reg`)
 * registers/links the Telegram identity to that phone + name; a plain login
 * nonce only signs in an already-known Telegram (`not_registered` otherwise —
 * never auto-creates a phone-less client).
 */
export async function pollClientTelegramLogin(nonce: string): Promise<ClientTelegramPollResult> {
  const record = await peekLoginNonce(nonce);
  if (!record || record.aud !== 'client-login') return { status: 'expired' };
  if (record.status === 'pending') return { status: 'pending' };
  if (record.status === 'error') return { status: 'error', message: record.error ?? 'Ошибка входа' };

  const consumed = await consumeLoginNonce(nonce);
  if (!consumed || consumed.status !== 'confirmed' || !consumed.tg) return { status: 'expired' };

  if (consumed.reg) return registerClientByTelegram(consumed.tg, consumed.reg);

  const client = await prisma.client.findUnique({ where: { telegramId: consumed.tg.id } });
  if (!client) return { status: 'not_registered' };
  return {
    status: 'confirmed',
    client: await prisma.client.update({
      where: { id: client.id },
      data: { telegramUsername: consumed.tg.username ?? null },
    }),
  };
}

/**
 * Registration via Telegram: the confirmed Telegram identity is the credential;
 * the user-typed phone + name fill the profile. Conflicts:
 * - Telegram already known → it's a login; backfill the phone only if free.
 * - Phone belongs to a client without Telegram → link this Telegram to it.
 * - Phone belongs to a client with a different Telegram → error.
 */
async function registerClientByTelegram(
  tg: TgUser,
  reg: { phone: string; name: string },
): Promise<ClientTelegramPollResult> {
  const linkTakenError = {
    status: 'error' as const,
    message: 'Этот номер уже привязан к другому Telegram-аккаунту',
  };
  try {
    const [byTg, byPhone] = await Promise.all([
      prisma.client.findUnique({ where: { telegramId: tg.id } }),
      prisma.client.findUnique({ where: { phone: reg.phone } }),
    ]);

    if (byTg) {
      const phoneFree = !byPhone || byPhone.id === byTg.id;
      const client = await prisma.client.update({
        where: { id: byTg.id },
        data: {
          telegramUsername: tg.username ?? null,
          ...(phoneFree && !byTg.phone ? { phone: reg.phone } : {}),
        },
      });
      return { status: 'confirmed', client };
    }

    if (byPhone) {
      if (byPhone.telegramId) return linkTakenError;
      const client = await prisma.client.update({
        where: { id: byPhone.id },
        data: { telegramId: tg.id, telegramUsername: tg.username ?? null },
      });
      return { status: 'confirmed', client };
    }

    const client = await prisma.client.create({
      data: {
        name: reg.name,
        phone: reg.phone,
        telegramId: tg.id,
        telegramUsername: tg.username ?? null,
        whatsapp: true,
      },
    });
    return { status: 'confirmed', client };
  } catch (err) {
    // Unique race on phone/telegramId (concurrent register or booking upsert).
    if ((err as { code?: string }).code === 'P2002') return linkTakenError;
    throw err;
  }
}

/** Login with phone + password (set at registration, via reset, or by an admin). */
export async function loginWithPassword(input: ClientLoginInput) {
  const phone = normalizePhone(input.phone);
  const client = await prisma.client.findUnique({ where: { phone } });
  if (!client || !client.passwordHash) throw Errors.unauthorized('Неверный телефон или пароль');

  const ok = await bcrypt.compare(input.password, client.passwordHash);
  if (!ok) throw Errors.unauthorized('Неверный телефон или пароль');
  return client;
}

/**
 * Set or update the client's password (called from /me/password when
 * authenticated). Self-set passwords are hash-only; any stale admin-issued
 * plaintext is wiped so the admin panel never shows a password that no
 * longer works.
 */
export async function setClientPassword(clientId: string, input: SetClientPasswordInput) {
  const hash = await bcrypt.hash(input.password, 10);
  return prisma.client.update({
    where: { id: clientId },
    data: { passwordHash: hash, passwordRaw: null },
  });
}
