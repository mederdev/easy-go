import type { FastifyPluginAsync } from 'fastify';
import {
  ClientLoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  TelegramLoginInput,
  TelegramPollInput,
  type ClientJwtClaims,
  type TelegramStartResponse,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import { createLoginNonce } from '../../lib/telegram-login.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  // Step 1: phone → OTP (rate-limited per phone inside lib/otp).
  app.post('/request-otp', async (request) => {
    const { phone } = parse(OtpRequestInput, request.body);
    return svc.requestOtp(phone);
  });

  // Step 2: phone + code → customer JWT.
  app.post('/verify', async (request) => {
    const input = parse(OtpVerifyInput, request.body);
    const client = await svc.verifyAndUpsertClient(input);
    const claims: ClientJwtClaims = { kind: 'client', sub: client.id, name: client.name };
    const token = app.jwt.sign(claims);
    return { token, client };
  });

  // Telegram Login Widget → customer JWT (creates the client on first login).
  // Legacy path — the app now uses the domain-independent deep-link flow below.
  app.post('/telegram', async (request) => {
    const input = parse(TelegramLoginInput, request.body);
    const client = await svc.loginWithTelegram(input);
    const claims: ClientJwtClaims = { kind: 'client', sub: client.id, name: client.name };
    const token = app.jwt.sign(claims);
    return { token, client };
  });

  // Telegram deep-link login: issue a one-time nonce for t.me/<bot>?start=<nonce>…
  app.post('/telegram/start', async (): Promise<TelegramStartResponse> => {
    return createLoginNonce('client-login');
  });

  // …then the frontend polls until the bot confirms it and a JWT is issued.
  // (No explicit response type: Prisma Dates serialize to strings at the edge.)
  app.post('/telegram/poll', async (request) => {
    const { nonce } = parse(TelegramPollInput, request.body);
    const result = await svc.pollClientTelegramLogin(nonce);
    if (result.status !== 'confirmed') return result;
    const claims: ClientJwtClaims = { kind: 'client', sub: result.client.id, name: result.client.name };
    return { status: 'confirmed', token: app.jwt.sign(claims), client: result.client };
  });

  // Альтернатива: телефон + пароль (после того как пароль установлен).
  app.post('/login', async (request) => {
    const input = parse(ClientLoginInput, request.body);
    const client = await svc.loginWithPassword(input);
    const claims: ClientJwtClaims = { kind: 'client', sub: client.id, name: client.name };
    const token = app.jwt.sign(claims);
    return { token, client };
  });
};

export default routes;
