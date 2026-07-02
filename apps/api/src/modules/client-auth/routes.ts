import type { FastifyPluginAsync } from 'fastify';
import {
  ClientLoginInput,
  ClientRegisterInput,
  ClientTelegramStartInput,
  TelegramPollInput,
  type ClientJwtClaims,
  type TelegramStartResponse,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import { normalizePhone } from '../../lib/phone.js';
import { createLoginNonce } from '../../lib/telegram-login.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  const signFor = (client: { id: string; name: string }): string => {
    const claims: ClientJwtClaims = { kind: 'client', sub: client.id, name: client.name };
    return app.jwt.sign(claims);
  };

  // Регистрация: телефон + имя + пароль (альтернатива — через Telegram ниже).
  app.post('/register', async (request, reply) => {
    const input = parse(ClientRegisterInput, request.body);
    const client = await svc.registerClient(input);
    reply.code(201);
    return { token: signFor(client), client: svc.toClientView(client) };
  });

  // Вход: телефон + пароль.
  app.post('/login', async (request) => {
    const input = parse(ClientLoginInput, request.body);
    const client = await svc.loginWithPassword(input);
    return { token: signFor(client), client: svc.toClientView(client) };
  });

  // Telegram deep-link: issue a one-time nonce for t.me/<bot>?start=<nonce>.
  // With a body (phone + name) the confirmed Telegram registers with them;
  // without one it's a plain login for an already-known Telegram.
  app.post('/telegram/start', async (request): Promise<TelegramStartResponse> => {
    const input = request.body ? parse(ClientTelegramStartInput, request.body) : undefined;
    return createLoginNonce('client-login', {
      reg: input ? { phone: normalizePhone(input.phone), name: input.name.trim() } : undefined,
    });
  });

  // …then the frontend polls until the bot confirms it and a JWT is issued.
  app.post('/telegram/poll', async (request) => {
    const { nonce } = parse(TelegramPollInput, request.body);
    const result = await svc.pollClientTelegramLogin(nonce);
    if (result.status !== 'confirmed') return result;
    return { status: 'confirmed', token: signFor(result.client), client: svc.toClientView(result.client) };
  });
};

export default routes;
