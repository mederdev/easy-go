import { describe, it, expect } from 'vitest';
import { getApp, bearer, userToken, clientToken } from './helpers/app.js';
import { makeUser, makeClientRow } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

describe('POST /auth/login (back-office)', () => {
  it('logs in with correct phone + password → token + user', async () => {
    const app = await getApp();
    const { user } = await makeUser({ role: 'admin', password: 'easygo123' });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { phone: user.phone, password: 'easygo123' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.user).toMatchObject({ id: user.id, name: user.name, phone: user.phone, role: 'admin' });
    // never leak the hash
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('normalizes the phone before lookup', async () => {
    const app = await getApp();
    await makeUser({ phone: '+996700500001', password: 'easygo123' });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { phone: '996 700 500 001', password: 'easygo123' } });
    expect(res.statusCode).toBe(200);
  });

  it('unknown phone → 401 UNAUTHORIZED (no user enumeration)', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { phone: '+996700999999', password: 'whatever1' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('wrong password → 401 with the same message as unknown phone', async () => {
    const app = await getApp();
    const { user } = await makeUser({ password: 'easygo123' });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { phone: user.phone, password: 'wrongpass' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.message).toContain('Неверный телефон или пароль');
  });

  it('too-short password → 422 VALIDATION', async () => {
    const app = await getApp();
    const { user } = await makeUser({ password: 'easygo123' });
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { phone: user.phone, password: '123' } });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('VALIDATION');
  });
});

describe('GET /auth/me', () => {
  it('returns the authenticated user', async () => {
    const app = await getApp();
    const { user, headers } = await makeUser({ role: 'owner' });
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: user.id, role: 'owner' });
  });

  it('no token → 401 UNAUTHORIZED', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('client token (wrong kind) → 403 FORBIDDEN', async () => {
    const app = await getApp();
    const { client } = await makeClientRow();
    const token = await clientToken(client.id);
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: bearer(token) });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });

  it('garbage token → 401', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: bearer('not-a-jwt') });
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/telegram/start + poll (bot login)', () => {
  it('start returns a 32-char nonce, deep link and 600s TTL', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/auth/telegram/start' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.nonce).toHaveLength(32);
    expect(body.expiresIn).toBe(600);
    expect(body.deepLink).toContain('easygo_test_bot');
    expect(body.deepLink).toContain(body.nonce);
  });

  it('poll of a fresh nonce → pending', async () => {
    const app = await getApp();
    const start = await app.inject({ method: 'POST', url: '/auth/telegram/start' });
    const { nonce } = start.json();
    const res = await app.inject({ method: 'POST', url: '/auth/telegram/poll', payload: { nonce } });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('pending');
  });

  it('poll with a wrong-length nonce → 422', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/auth/telegram/poll', payload: { nonce: 'short' } });
    expect(res.statusCode).toBe(422);
  });

  it('full flow: dev-confirm a linked employee → poll returns confirmed + token', async () => {
    const app = await getApp();
    // employee whose telegramId matches what dev-confirm will stamp
    const { user } = await makeUser({ role: 'admin' });
    await prisma.user.update({ where: { id: user.id }, data: { telegramId: '555000111' } });

    const start = await app.inject({ method: 'POST', url: '/auth/telegram/start' });
    const { nonce } = start.json();
    const confirm = await app.inject({ method: 'POST', url: '/auth/telegram/dev-confirm', payload: { nonce, telegramId: '555000111' } });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json()).toMatchObject({ ok: true });

    const poll = await app.inject({ method: 'POST', url: '/auth/telegram/poll', payload: { nonce } });
    expect(poll.statusCode).toBe(200);
    const body = poll.json();
    expect(body.status).toBe('confirmed');
    expect(body.token).toBeTypeOf('string');
    expect(body.user).toMatchObject({ id: user.id, telegramId: '555000111' });
  });

  it('dev-confirm a telegramId linked to nobody → poll error', async () => {
    const app = await getApp();
    const start = await app.inject({ method: 'POST', url: '/auth/telegram/start' });
    const { nonce } = start.json();
    await app.inject({ method: 'POST', url: '/auth/telegram/dev-confirm', payload: { nonce, telegramId: '999888777' } });
    const poll = await app.inject({ method: 'POST', url: '/auth/telegram/poll', payload: { nonce } });
    expect(poll.json().status).toBe('error');
  });

  it('nonce is one-time: a second poll after confirm no longer confirms', async () => {
    const app = await getApp();
    const { user } = await makeUser({ role: 'owner' });
    await prisma.user.update({ where: { id: user.id }, data: { telegramId: '111222333' } });
    const start = await app.inject({ method: 'POST', url: '/auth/telegram/start' });
    const { nonce } = start.json();
    await app.inject({ method: 'POST', url: '/auth/telegram/dev-confirm', payload: { nonce, telegramId: '111222333' } });
    const first = await app.inject({ method: 'POST', url: '/auth/telegram/poll', payload: { nonce } });
    expect(first.json().status).toBe('confirmed');
    const second = await app.inject({ method: 'POST', url: '/auth/telegram/poll', payload: { nonce } });
    expect(second.json().status).not.toBe('confirmed');
  });
});

describe('Telegram account linking', () => {
  it('link/start requires a user token', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/auth/telegram/link/start' });
    expect(res.statusCode).toBe(401);
  });

  it('link then unlink clears telegram fields', async () => {
    const app = await getApp();
    const { user, headers } = await makeUser({ role: 'owner' });
    await prisma.user.update({ where: { id: user.id }, data: { telegramId: '424242', telegramUsername: 'tg_user' } });
    const res = await app.inject({ method: 'DELETE', url: '/auth/telegram/link', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ telegramId: null, telegramUsername: null });
  });
});
