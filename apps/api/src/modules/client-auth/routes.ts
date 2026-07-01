import type { FastifyPluginAsync } from 'fastify';
import {
  ClientLoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  TelegramLoginInput,
  type ClientJwtClaims,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
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
  app.post('/telegram', async (request) => {
    const input = parse(TelegramLoginInput, request.body);
    const client = await svc.loginWithTelegram(input);
    const claims: ClientJwtClaims = { kind: 'client', sub: client.id, name: client.name };
    const token = app.jwt.sign(claims);
    return { token, client };
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
