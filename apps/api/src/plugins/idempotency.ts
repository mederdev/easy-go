import fp from 'fastify-plugin';
import { createHash } from 'node:crypto';
import { IDEMPOTENCY_HEADER } from '@easygo/shared';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

/**
 * Idempotency-Key support. Opt a route in with `config: { idempotent: true }`.
 * A repeat with the same key + same body returns the stored response; the same
 * key with a *different* body is a 409. Keyless requests pass through.
 */

declare module 'fastify' {
  interface FastifyContextConfig {
    idempotent?: boolean;
  }
  interface FastifyRequest {
    _idemKey?: string;
    _idemHash?: string;
  }
}

function hashRequest(method: string, url: string, body: unknown): string {
  return createHash('sha256').update(`${method} ${url} ${JSON.stringify(body ?? null)}`).digest('hex');
}

export default fp(async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (!request.routeOptions.config?.idempotent) return;
    const key = request.headers[IDEMPOTENCY_HEADER];
    if (typeof key !== 'string' || key.length === 0) return; // optional

    const hash = hashRequest(request.method, request.url, request.body);
    request._idemKey = key;
    request._idemHash = hash;

    const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (!existing) return;

    if (existing.requestHash !== hash) {
      throw new AppError(409, 'IDEMPOTENCY_MISMATCH', 'Idempotency-Key уже использован с другим запросом');
    }
    reply.header('idempotent-replay', 'true');
    return reply.code(existing.statusCode).send(existing.response);
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const key = request._idemKey;
    if (!key || reply.getHeader('idempotent-replay')) return payload;
    if (reply.statusCode < 200 || reply.statusCode >= 300) return payload;

    let parsed: unknown = null;
    try {
      parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch {
      return payload;
    }
    // Store first-writer-wins; ignore races on the unique key.
    await prisma.idempotencyKey
      .create({
        data: {
          key,
          endpoint: `${request.method} ${request.routeOptions.url ?? request.url}`,
          requestHash: request._idemHash ?? '',
          response: parsed as object,
          statusCode: reply.statusCode,
        },
      })
      .catch(() => undefined);
    return payload;
  });
}, { name: 'idempotency' });
