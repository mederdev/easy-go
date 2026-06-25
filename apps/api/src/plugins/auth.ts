import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import type { JwtClaims, UserRole } from '@easygo/shared';
import { env } from '../env.js';
import { Errors } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler: requires a valid JWT. */
    authenticate: preHandlerHookHandler;
    /** preHandler factory: requires the user to hold one of `roles`. */
    authorize: (roles: UserRole[]) => preHandlerHookHandler;
  }
  interface FastifyRequest {
    auth?: JwtClaims;
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

  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      await request.jwtVerify();
      request.auth = request.user;
    } catch {
      throw Errors.unauthorized();
    }
  });

  app.decorate('authorize', function (roles: UserRole[]): preHandlerHookHandler {
    return async function (request: FastifyRequest, _reply: FastifyReply) {
      try {
        await request.jwtVerify();
        request.auth = request.user;
      } catch {
        throw Errors.unauthorized();
      }
      if (!roles.includes(request.user.role)) throw Errors.forbidden();
    };
  });
}, { name: 'auth' });
