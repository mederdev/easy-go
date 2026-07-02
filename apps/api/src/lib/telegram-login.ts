import { randomBytes } from 'node:crypto';
import { makeRedis } from './queue.js';
import { env } from '../env.js';

/**
 * One-time nonces for Telegram deep-link login (t.me/<bot>?start=<nonce>).
 * Unlike the Login Widget this is domain-independent, so one bot serves both
 * the client site and the admin CRM.
 *
 * Lifecycle: pending → confirmed (bot saw /start) → consumed (token issued,
 * key deleted via GETDEL), or pending → error (e.g. unlinked admin Telegram).
 * The audience is baked in at creation so a client-login nonce can never be
 * consumed by the admin flow (and vice versa).
 */

const redis = makeRedis();

const TTL_SECONDS = 600; // 10 min to open Telegram and press Start

export type TgAudience = 'client-login' | 'admin-login' | 'admin-link';

/** Telegram identity as seen by the bot in the /start message. */
export interface TgUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
}

export interface TgNonceRecord {
  aud: TgAudience;
  status: 'pending' | 'confirmed' | 'error';
  /** For 'admin-link': the already-authenticated user this nonce belongs to. */
  userId?: string;
  /** Russian message shown to the polling frontend when status = 'error'. */
  error?: string;
  tg?: TgUser;
}

const key = (nonce: string) => `tg:nonce:${nonce}`;

export async function createLoginNonce(
  aud: TgAudience,
  userId?: string,
): Promise<{ nonce: string; deepLink: string | null; expiresIn: number }> {
  const nonce = randomBytes(16).toString('hex'); // 32 chars — fits the 64-char /start payload limit
  const record: TgNonceRecord = { aud, status: 'pending', ...(userId ? { userId } : {}) };
  await redis.set(key(nonce), JSON.stringify(record), 'EX', TTL_SECONDS);
  const deepLink = env.TELEGRAM_BOT_USERNAME
    ? `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${nonce}`
    : null; // dev without a bot — the UI shows the dev-confirm button instead
  return { nonce, deepLink, expiresIn: TTL_SECONDS };
}

/** Non-destructive read (used by poll endpoints while status is pending/error). */
export async function peekLoginNonce(nonce: string): Promise<TgNonceRecord | null> {
  const raw = await redis.get(key(nonce));
  return raw ? (JSON.parse(raw) as TgNonceRecord) : null;
}

/** Bot handler: pending → confirmed with the Telegram identity. Preserves TTL. */
export async function confirmLoginNonce(nonce: string, tg: TgUser): Promise<TgNonceRecord | null> {
  const k = key(nonce);
  const raw = await redis.get(k);
  if (!raw) return null;
  const record = JSON.parse(raw) as TgNonceRecord;
  if (record.status !== 'pending') return record;
  const updated: TgNonceRecord = { ...record, status: 'confirmed', tg };
  const ttl = await redis.ttl(k);
  await redis.set(k, JSON.stringify(updated), 'EX', Math.max(ttl, 60));
  return updated;
}

/** Bot handler: pending → error with a Russian message for the polling UI. */
export async function failLoginNonce(nonce: string, error: string): Promise<void> {
  const k = key(nonce);
  const raw = await redis.get(k);
  if (!raw) return;
  const record = JSON.parse(raw) as TgNonceRecord;
  if (record.status !== 'pending') return;
  const ttl = await redis.ttl(k);
  await redis.set(k, JSON.stringify({ ...record, status: 'error', error }), 'EX', Math.max(ttl, 60));
}

/** One-time consumption (GETDEL) — call only when issuing the session/link. */
export async function consumeLoginNonce(nonce: string): Promise<TgNonceRecord | null> {
  const raw = await redis.getdel(key(nonce));
  return raw ? (JSON.parse(raw) as TgNonceRecord) : null;
}
