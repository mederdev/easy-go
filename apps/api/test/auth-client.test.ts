import { describe, it, expect } from 'vitest';
import { getApp, bearer, driverToken } from './helpers/app.js';
import { makeClientRow, makeDriver, uniquePhone } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

describe('POST /client-auth/register', () => {
  it('registers a new customer → 201 with token + client (no secrets)', async () => {
    const app = await getApp();
    const phone = uniquePhone();
    const res = await app.inject({ method: 'POST', url: '/client-auth/register', payload: { phone, name: 'Азамат', password: 'clientpass' } });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.client).toMatchObject({ name: 'Азамат', phone });
    expect(body.client.passwordHash).toBeUndefined();
    expect(body.client.passwordRaw).toBeUndefined();
    expect(body.client.tripsCount).toBe(0);
  });

  it('rejects an already-registered phone → 409 PHONE_TAKEN', async () => {
    const app = await getApp();
    const phone = uniquePhone();
    await app.inject({ method: 'POST', url: '/client-auth/register', payload: { phone, name: 'A', password: 'clientpass' } });
    const res = await app.inject({ method: 'POST', url: '/client-auth/register', payload: { phone, name: 'B', password: 'clientpass' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('PHONE_TAKEN');
  });

  it('a booking-created (credential-less) phone cannot self-register', async () => {
    const app = await getApp();
    const phone = uniquePhone();
    await prisma.client.create({ data: { name: 'Гость', phone } }); // no passwordHash
    const res = await app.inject({ method: 'POST', url: '/client-auth/register', payload: { phone, name: 'Гость', password: 'clientpass' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('PHONE_TAKEN');
  });

  it('missing name → 422', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/client-auth/register', payload: { phone: uniquePhone(), password: 'clientpass' } });
    expect(res.statusCode).toBe(422);
  });
});

describe('POST /client-auth/login', () => {
  it('logs in with the registered password', async () => {
    const app = await getApp();
    const { client } = await makeClientRow({ password: 'clientpass' });
    const res = await app.inject({ method: 'POST', url: '/client-auth/login', payload: { phone: client.phone, password: 'clientpass' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().client).toMatchObject({ id: client.id });
  });

  it('a telegram-only client (no password) → 401, indistinguishable from unknown', async () => {
    const app = await getApp();
    const { client } = await makeClientRow(); // no password
    const res = await app.inject({ method: 'POST', url: '/client-auth/login', payload: { phone: client.phone, password: 'anything1' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('UNAUTHORIZED');
  });

  it('wrong password → 401', async () => {
    const app = await getApp();
    const { client } = await makeClientRow({ password: 'clientpass' });
    const res = await app.inject({ method: 'POST', url: '/client-auth/login', payload: { phone: client.phone, password: 'nope12345' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('client JWT vs other kinds', () => {
  it('a driver token cannot use a client-only route (/me)', async () => {
    const app = await getApp();
    const { driver } = await makeDriver();
    const token = await driverToken(driver.id);
    const res = await app.inject({ method: 'GET', url: '/me', headers: bearer(token) });
    expect(res.statusCode).toBe(403);
  });
});

describe('POST /client-auth/telegram/start (login vs register nonce)', () => {
  it('start without body → login nonce', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/client-auth/telegram/start' });
    expect(res.statusCode).toBe(200);
    expect(res.json().nonce).toHaveLength(32);
  });

  it('login-nonce for an unknown telegram → not_registered', async () => {
    const app = await getApp();
    const start = await app.inject({ method: 'POST', url: '/client-auth/telegram/start' });
    const { nonce } = start.json();
    await app.inject({ method: 'POST', url: '/auth/telegram/dev-confirm', payload: { nonce, telegramId: '700700700' } });
    const poll = await app.inject({ method: 'POST', url: '/client-auth/telegram/poll', payload: { nonce } });
    expect(poll.statusCode).toBe(200);
    expect(poll.json().status).toBe('not_registered');
  });

  it('register-nonce creates a client and links telegram → confirmed', async () => {
    const app = await getApp();
    const phone = uniquePhone();
    const start = await app.inject({ method: 'POST', url: '/client-auth/telegram/start', payload: { phone, name: 'Телеграм Клиент' } });
    const { nonce } = start.json();
    await app.inject({ method: 'POST', url: '/auth/telegram/dev-confirm', payload: { nonce, telegramId: '800800800' } });
    const poll = await app.inject({ method: 'POST', url: '/client-auth/telegram/poll', payload: { nonce } });
    expect(poll.statusCode).toBe(200);
    const body = poll.json();
    expect(body.status).toBe('confirmed');
    expect(body.token).toBeTypeOf('string');
    expect(body.client).toMatchObject({ phone, telegramId: '800800800' });
  });

  it('register-nonce attaches to an existing password-less phone row (claims the booking client)', async () => {
    const app = await getApp();
    const phone = uniquePhone();
    const existing = await prisma.client.create({ data: { name: 'Бронь-гость', phone } });
    const start = await app.inject({ method: 'POST', url: '/client-auth/telegram/start', payload: { phone, name: 'Бронь-гость' } });
    const { nonce } = start.json();
    await app.inject({ method: 'POST', url: '/auth/telegram/dev-confirm', payload: { nonce, telegramId: '801801801' } });
    const poll = await app.inject({ method: 'POST', url: '/client-auth/telegram/poll', payload: { nonce } });
    expect(poll.json().status).toBe('confirmed');
    expect(poll.json().client.id).toBe(existing.id); // same row, now linked
  });
});
