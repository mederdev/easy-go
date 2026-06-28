import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { JwtClaims, UserRole } from '@easygo/shared';
import { env } from '../env.js';
import { Errors } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler: requires a valid back-office JWT (kind=user). */
    authenticate: preHandlerHookHandler;
    /** preHandler factory: requires a back-office user holding one of `roles`. */
    authorize: (roles: UserRole[]) => preHandlerHookHandler;
    /** preHandler: requires a valid customer JWT (kind=client). */
    authenticateClient: preHandlerHookHandler;
    /** preHandler: requires a valid driver JWT (kind=driver). */
    authenticateDriver: preHandlerHookHandler;
  }
  interface FastifyRequest {
    auth?: JwtClaims;
    /** Set by `authenticateClient` — the authenticated customer's id. */
    clientId?: string;
    /** Set by `authenticateDriver` — the authenticated driver's id. */
    driverId?: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtClaims;
    user: JwtClaims;
  }
}

export default fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  async function verify(request: FastifyRequest): Promise<JwtClaims> {
    try {
      await request.jwtVerify();
    } catch {
      throw Errors.unauthorized();
    }
    request.auth = request.user;
    return request.user;
  }

  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    const claims = await verify(request);
    if (claims.kind !== 'user') throw Errors.forbidden();
  });

  app.decorate('authorize', function (roles: UserRole[]): preHandlerHookHandler {
    return async function (request: FastifyRequest, _reply: FastifyReply) {
      const claims = await verify(request);
      if (claims.kind !== 'user' || !roles.includes(claims.role)) throw Errors.forbidden();
    };
  });

  app.decorate('authenticateClient', async function (request: FastifyRequest, _reply: FastifyReply) {
    const claims = await verify(request);
    if (claims.kind !== 'client') throw Errors.forbidden();
    request.clientId = claims.sub;
  });

  app.decorate('authenticateDriver', async function (request: FastifyRequest, _reply: FastifyReply) {
    const claims = await verify(request);
    if (claims.kind !== 'driver') throw Errors.forbidden();
    request.driverId = claims.sub;
  });
}, { name: 'auth' });
