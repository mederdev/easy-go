import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser } from './helpers/factories.js';

describe('GET /config (public)', () => {
  it('bootstraps and returns the singleton with defaults', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/config' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ currency: 'KGS', companyName: 'EasyGo', locale: 'ru-RU' });
  });
});

describe('PATCH /config (admin/owner)', () => {
  it('operator is forbidden → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'PATCH', url: '/config', headers, payload: { companyName: 'Nope' } });
    expect(res.statusCode).toBe(403);
  });

  it('admin updates currency + whatsapp + notify chat', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const res = await app.inject({ method: 'PATCH', url: '/config', headers, payload: { currency: 'KZT', whatsappPhone: '77010000000', telegramNotifyChatId: '-100500' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ currency: 'KZT', whatsappPhone: '77010000000', telegramNotifyChatId: '-100500' });
  });

  it('can clear the notify chat with null', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'owner' });
    await app.inject({ method: 'PATCH', url: '/config', headers, payload: { telegramNotifyChatId: '-100500' } });
    const res = await app.inject({ method: 'PATCH', url: '/config', headers, payload: { telegramNotifyChatId: null } });
    expect(res.json().telegramNotifyChatId).toBeNull();
  });

  it('invalid currency → 422', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const res = await app.inject({ method: 'PATCH', url: '/config', headers, payload: { currency: 'EUR' } });
    expect(res.statusCode).toBe(422);
  });
});
