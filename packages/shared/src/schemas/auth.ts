import { z } from 'zod';
import { Id, Phone } from './common.js';
import { UserRole } from '../enums.js';

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

/** JWT payload (signed by the API). */
export const JwtClaims = z.object({
  sub: Id,
  role: UserRole,
  name: z.string(),
});
export type JwtClaims = z.infer<typeof JwtClaims>;
