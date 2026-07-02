import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import type { AuthUser, LoginInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { consumeLoginNonce, peekLoginNonce, type TgAudience } from '../../lib/telegram-login.js';

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    telegramId: user.telegramId,
    telegramUsername: user.telegramUsername,
  };
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const phone = normalizePhone(input.phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw Errors.unauthorized('Неверный телефон или пароль');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw Errors.unauthorized('Неверный телефон или пароль');

  return toAuthUser(user);
}

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('Пользователь');
  return toAuthUser(user);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

// ── Telegram deep-link login / account linking ──

export type AdminTelegramPollResult =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'error'; message: string }
  | { status: 'confirmed'; user: AuthUser };

/** Shared poll shape: pending/error are non-destructive; confirmed consumes. */
async function pollNonce(
  nonce: string,
  aud: TgAudience,
  userId?: string,
): Promise<{ status: 'pending' } | { status: 'expired' } | { status: 'error'; message: string } | { tgId: string; tgUsername?: string }> {
  const record = await peekLoginNonce(nonce);
  // Audience (and owner, for link nonces) is part of the key's identity — a
  // client-login nonce must never surface through the admin endpoints.
  if (!record || record.aud !== aud || (userId !== undefined && record.userId !== userId)) {
    return { status: 'expired' };
  }
  if (record.status === 'pending') return { status: 'pending' };
  if (record.status === 'error') return { status: 'error', message: record.error ?? 'Ошибка входа' };

  const consumed = await consumeLoginNonce(nonce); // one-time: GETDEL
  if (!consumed || consumed.status !== 'confirmed' || !consumed.tg) return { status: 'expired' };
  return { tgId: consumed.tg.id, tgUsername: consumed.tg.username };
}

export async function pollAdminTelegramLogin(nonce: string): Promise<AdminTelegramPollResult> {
  const result = await pollNonce(nonce, 'admin-login');
  if ('status' in result) return result;

  // The bot already checked the link, but the consume side re-verifies — this
  // is the actual security boundary for issuing a user JWT.
  const user = await prisma.user.findUnique({ where: { telegramId: result.tgId } });
  if (!user) return { status: 'error', message: 'Этот Telegram-аккаунт не привязан к сотруднику' };
  return { status: 'confirmed', user: toAuthUser(user) };
}

export type TelegramLinkPollResult =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'error'; message: string }
  | { status: 'confirmed'; user: AuthUser };

export async function pollTelegramLink(userId: string, nonce: string): Promise<TelegramLinkPollResult> {
  const result = await pollNonce(nonce, 'admin-link', userId);
  if ('status' in result) return result;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telegramId: result.tgId, telegramUsername: result.tgUsername ?? null },
    });
    return { status: 'confirmed', user: toAuthUser(user) };
  } catch (err) {
    // Unique constraint on telegramId — linked to another user meanwhile.
    if ((err as { code?: string }).code === 'P2002') {
      return { status: 'error', message: 'Этот Telegram уже привязан к другому аккаунту' };
    }
    throw err;
  }
}

export async function unlinkTelegram(userId: string): Promise<AuthUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { telegramId: null, telegramUsername: null },
  });
  return toAuthUser(user);
}
