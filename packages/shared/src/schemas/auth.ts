import { z } from 'zod';
import { Id, Phone } from './common.js';
import { UserRole } from '../enums.js';
import { Client } from './client.js';

// ── Back-office (operator/admin/owner) ──
export const LoginInput = z.object({
  phone: Phone,
  password: z.string().min(6).max(100),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const AuthUser = z.object({
  id: Id,
  name: z.string(),
  phone: z.string(),
  role: UserRole,
  /** Linked Telegram account (bot login + booking notifications). */
  telegramId: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const AuthResponse = z.object({
  token: z.string(),
  user: AuthUser,
});
export type AuthResponse = z.infer<typeof AuthResponse>;

// ── JWT payloads (discriminated by `kind`) ──
export const UserJwtClaims = z.object({
  kind: z.literal('user'),
  sub: Id,
  role: UserRole,
  name: z.string(),
});
export type UserJwtClaims = z.infer<typeof UserJwtClaims>;

export const ClientJwtClaims = z.object({
  kind: z.literal('client'),
  sub: Id, // clientId
  name: z.string(),
});
export type ClientJwtClaims = z.infer<typeof ClientJwtClaims>;

export const DriverJwtClaims = z.object({
  kind: z.literal('driver'),
  sub: Id, // driverId
  name: z.string(),
});
export type DriverJwtClaims = z.infer<typeof DriverJwtClaims>;

export const JwtClaims = z.discriminatedUnion('kind', [UserJwtClaims, ClientJwtClaims, DriverJwtClaims]);
export type JwtClaims = z.infer<typeof JwtClaims>;

// ── Customer registration (phone + name, then password or Telegram) ──
export const ClientRegisterInput = z.object({
  phone: Phone,
  name: z.string().min(1).max(120),
  password: z.string().min(6).max(100),
});
export type ClientRegisterInput = z.infer<typeof ClientRegisterInput>;

export const ClientAuthResponse = z.object({
  token: z.string(),
  client: Client,
});
export type ClientAuthResponse = z.infer<typeof ClientAuthResponse>;

/** Customer phone + password login (after password has been set). */
export const ClientLoginInput = z.object({
  phone: Phone,
  password: z.string().min(6).max(100),
});
export type ClientLoginInput = z.infer<typeof ClientLoginInput>;

// ── Telegram deep-link login (t.me/<bot>?start=<nonce>) ──
// Domain-independent: one bot serves both the client site and the admin CRM.
// The API issues a one-time nonce, the user confirms it in the bot chat, and
// the frontend polls until the nonce is confirmed.

/**
 * Optional body of POST /client-auth/telegram/start. Presence means
 * registration: the confirmed Telegram identity is registered with this
 * phone + name (the TG profile name may be hidden, so we never rely on it).
 */
export const ClientTelegramStartInput = z.object({
  phone: Phone,
  name: z.string().min(1).max(120),
});
export type ClientTelegramStartInput = z.infer<typeof ClientTelegramStartInput>;

export const TelegramStartResponse = z.object({
  nonce: z.string(),
  /** Ready-to-open t.me link; null in dev when no bot username is configured. */
  deepLink: z.string().nullable(),
  expiresIn: z.number().int(),
});
export type TelegramStartResponse = z.infer<typeof TelegramStartResponse>;

export const TelegramPollInput = z.object({ nonce: z.string().length(32) });
export type TelegramPollInput = z.infer<typeof TelegramPollInput>;

export const AdminTelegramPollResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('confirmed'), token: z.string(), user: AuthUser }),
  z.object({ status: z.literal('error'), message: z.string() }),
  z.object({ status: z.literal('expired') }),
]);
export type AdminTelegramPollResponse = z.infer<typeof AdminTelegramPollResponse>;

export const ClientTelegramPollResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('confirmed'), token: z.string(), client: Client }),
  /** Login-only nonce (no registration payload) whose Telegram is unknown. */
  z.object({ status: z.literal('not_registered') }),
  z.object({ status: z.literal('error'), message: z.string() }),
  z.object({ status: z.literal('expired') }),
]);
export type ClientTelegramPollResponse = z.infer<typeof ClientTelegramPollResponse>;

/** Linking a Telegram account to an already-authenticated back-office user. */
export const TelegramLinkPollResponse = z.discriminatedUnion('status', [
  z.object({ status: z.literal('pending') }),
  z.object({ status: z.literal('confirmed'), user: AuthUser }),
  z.object({ status: z.literal('error'), message: z.string() }),
  z.object({ status: z.literal('expired') }),
]);
export type TelegramLinkPollResponse = z.infer<typeof TelegramLinkPollResponse>;

/** Customer sets or changes their password from личный кабинет. */
export const SetClientPasswordInput = z.object({
  password: z.string().min(6).max(100),
});
export type SetClientPasswordInput = z.infer<typeof SetClientPasswordInput>;

/** Customer self-service profile update (cannot change phone — it's identity). */
export const UpdateMyProfileInput = z.object({
  name: z.string().min(1).max(120).optional(),
  whatsapp: z.boolean().optional(),
});
export type UpdateMyProfileInput = z.infer<typeof UpdateMyProfileInput>;
