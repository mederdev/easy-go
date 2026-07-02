import type { FastifyPluginAsync } from 'fastify';
import {
  LoginInput,
  OtpRequestInput,
  OtpVerifyInput,
  TelegramPollInput,
  type AdminTelegramPollResponse,
  type AuthResponse,
  type AuthUser,
  type JwtClaims,
  type TelegramLinkPollResponse,
  type TelegramStartResponse,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import { confirmLoginNonce, createLoginNonce, peekLoginNonce } from '../../lib/telegram-login.js';
import { Errors } from '../../lib/errors.js';
import { isProd } from '../../env.js';
import {
  getMe,
  login,
  pollAdminTelegramLogin,
  pollTelegramLink,
  requestUserOtp,
  unlinkTelegram,
  verifyUserOtp,
} from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  const signFor = (user: AuthUser): string => {
    const claims: JwtClaims = { kind: 'user', sub: user.id, role: user.role, name: user.name };
    return app.jwt.sign(claims);
  };

  app.post('/login', async (request): Promise<AuthResponse> => {
    const input = parse(LoginInput, request.body);
    const user = await login(input);
    return { token: signFor(user), user };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request): Promise<AuthResponse['user']> => {
    return getMe(request.auth!.sub);
  });

  // ── Phone + OTP (staff must already exist) ──

  app.post('/request-otp', async (request) => {
    const { phone } = parse(OtpRequestInput, request.body);
    return requestUserOtp(phone);
  });

  app.post('/verify-otp', async (request): Promise<AuthResponse> => {
    const input = parse(OtpVerifyInput, request.body);
    const user = await verifyUserOtp(input);
    return { token: signFor(user), user };
  });

  // ── Telegram deep-link login ──

  app.post('/telegram/start', async (): Promise<TelegramStartResponse> => {
    return createLoginNonce('admin-login');
  });

  app.post('/telegram/poll', async (request): Promise<AdminTelegramPollResponse> => {
    const { nonce } = parse(TelegramPollInput, request.body);
    const result = await pollAdminTelegramLogin(nonce);
    if (result.status !== 'confirmed') return result;
    return { status: 'confirmed', token: signFor(result.user), user: result.user };
  });

  // ── Linking the current user's Telegram (from admin settings) ──

  app.post('/telegram/link/start', { preHandler: [app.authenticate] }, async (request): Promise<TelegramStartResponse> => {
    return createLoginNonce('admin-link', request.auth!.sub);
  });

  app.post('/telegram/link/poll', { preHandler: [app.authenticate] }, async (request): Promise<TelegramLinkPollResponse> => {
    const { nonce } = parse(TelegramPollInput, request.body);
    return pollTelegramLink(request.auth!.sub, nonce);
  });

  app.delete('/telegram/link', { preHandler: [app.authenticate] }, async (request) => {
    return unlinkTelegram(request.auth!.sub);
  });

  // Dev-only: confirm any nonce without a real bot (both frontends use this to
  // exercise the deep-link flows locally — mirrors the OTP devCode stub).
  if (!isProd) {
    app.post('/telegram/dev-confirm', async (request) => {
      const { nonce } = parse(TelegramPollInput, request.body);
      const telegramId = (request.body as { telegramId?: string }).telegramId ?? '100000001';
      const record = await peekLoginNonce(nonce);
      if (!record) throw Errors.notFound('Код входа');
      await confirmLoginNonce(nonce, { id: telegramId, firstName: 'Тест', username: 'test_tg' });
      return { ok: true as const };
    });
  }
};

export default routes;
