import type { FastifyPluginAsync } from 'fastify';
import { LoginInput, type AuthResponse, type JwtClaims } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import { login, getMe } from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request): Promise<AuthResponse> => {
    const input = parse(LoginInput, request.body);
    const user = await login(input);
    const claims: JwtClaims = { kind: 'user', sub: user.id, role: user.role, name: user.name };
    const token = app.jwt.sign(claims);
    return { token, user };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request): Promise<AuthResponse['user']> => {
    return getMe(request.auth!.sub);
  });
};

export default routes;
