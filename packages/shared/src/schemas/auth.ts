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

// ── Customer phone + OTP auth ──
export const OtpRequestInput = z.object({ phone: Phone });
export type OtpRequestInput = z.infer<typeof OtpRequestInput>;

export const OtpRequestResponse = z.object({
  ok: z.literal(true),
  expiresIn: z.number().int(),
  /** Only present outside production — lets the dev UI auto-fill the code. */
  devCode: z.string().optional(),
});
export type OtpRequestResponse = z.infer<typeof OtpRequestResponse>;

export const OtpVerifyInput = z.object({
  phone: Phone,
  code: z.string().min(4).max(8),
  /** Optional display name captured on first login. */
  name: z.string().min(1).max(120).optional(),
});
export type OtpVerifyInput = z.infer<typeof OtpVerifyInput>;

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

/**
 * Telegram Login Widget payload (https://core.telegram.org/widgets/login).
 * The widget never returns a phone — the customer is created without one and
 * asked for a number later (at booking). Verified server-side via the `hash`.
 */
export const TelegramLoginInput = z.object({
  id: z.number().int(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number().int(),
  hash: z.string(),
});
export type TelegramLoginInput = z.infer<typeof TelegramLoginInput>;

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
