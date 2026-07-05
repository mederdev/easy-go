import type { FastifyInstance } from 'fastify';
import type { UserRole } from '@easygo/shared';
import { IDEMPOTENCY_HEADER } from '@easygo/shared';
import { buildApp } from '../../src/app.js';

let appPromise: Promise<FastifyInstance> | undefined;

/** Build the real Fastify app once and reuse it across all tests. */
export async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await buildApp();
      app.log.level = 'silent'; // keep test output clean
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}

// ── JWT helpers (sign directly with the app's @fastify/jwt, same secret) ──

export async function userToken(sub: string, role: UserRole, name = 'Test User'): Promise<string> {
  const app = await getApp();
  return app.jwt.sign({ kind: 'user', sub, role, name });
}

export async function clientToken(sub: string, name = 'Test Client'): Promise<string> {
  const app = await getApp();
  return app.jwt.sign({ kind: 'client', sub, name });
}

export async function driverToken(sub: string, name = 'Test Driver'): Promise<string> {
  const app = await getApp();
  return app.jwt.sign({ kind: 'driver', sub, name });
}

/** Authorization header object for inject(). */
export function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/** Idempotency-Key header object for inject(). */
export function idemKey(key: string): Record<string, string> {
  return { [IDEMPOTENCY_HEADER]: key };
}
