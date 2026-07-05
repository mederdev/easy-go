import { describe, it, expect } from 'vitest';
import { getApp, bearer } from './helpers/app.js';
import { makeUser } from './helpers/factories.js';

// Proves the whole stack is wired: .js-suffixed ESM imports resolve, the
// @easygo/shared workspace package loads, Prisma talks to easygo_test, and
// app.inject() serves requests through every plugin.
describe('smoke', () => {
  it('GET /health → ok', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('GET /config bootstraps the singleton with KGS defaults', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/config' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.currency).toBe('KGS');
    expect(body.companyName).toBe('EasyGo');
  });

  it('real login flow: seed a user → POST /auth/login → GET /auth/me', async () => {
    const app = await getApp();
    const { user } = await makeUser({ role: 'owner', password: 'easygo123' });

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { phone: user.phone, password: 'easygo123' },
    });
    expect(login.statusCode).toBe(200);
    const { token, user: me } = login.json();
    expect(token).toBeTypeOf('string');
    expect(me).toMatchObject({ id: user.id, role: 'owner', phone: user.phone });

    const meRes = await app.inject({ method: 'GET', url: '/auth/me', headers: bearer(token) });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({ id: user.id, role: 'owner' });
  });

  it('wrong password → 401 UNAUTHORIZED', async () => {
    const app = await getApp();
    const { user } = await makeUser({ password: 'easygo123' });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { phone: user.phone, password: 'nope123' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });
});
