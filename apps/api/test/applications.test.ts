import { describe, it, expect } from 'vitest';
import { getApp, idemKey } from './helpers/app.js';
import { makeUser, uniquePhone } from './helpers/factories.js';

describe('POST /applications/drivers (public, idempotent)', () => {
  it('accepts a driver application → 201 NEW; phone normalized', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/applications/drivers', payload: { name: 'Кандидат', phone: '996 700 55 44 33', hasCar: true, experience: '5 лет' } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ status: 'NEW', phone: '+996700554433', hasCar: true });
  });

  it('replays under an idempotency key', async () => {
    const app = await getApp();
    const payload = { name: 'Кандидат', phone: uniquePhone() };
    const key = 'drv-app-1';
    const a = await app.inject({ method: 'POST', url: '/applications/drivers', payload, headers: idemKey(key) });
    const b = await app.inject({ method: 'POST', url: '/applications/drivers', payload, headers: idemKey(key) });
    expect(b.headers['idempotent-replay']).toBe('true');
    expect(b.json().id).toBe(a.json().id);
  });
});

describe('POST /applications/partners (public)', () => {
  it('accepts a partner application → 201', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/applications/partners', payload: { company: 'ОсОО Тур', contacts: '+996700000000', proposal: 'Сотрудничество' } });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('NEW');
  });

  it('missing required contacts → 422', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/applications/partners', payload: { company: 'ОсОО Тур' } });
    expect(res.statusCode).toBe(422);
  });
});

describe('GET + PATCH applications (operator+)', () => {
  it('list requires a token', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/applications/drivers' })).statusCode).toBe(401);
  });

  it('lists and filters driver applications by status', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    await app.inject({ method: 'POST', url: '/applications/drivers', payload: { name: 'A', phone: uniquePhone() } });
    const list = await app.inject({ method: 'GET', url: '/applications/drivers?status=NEW', headers });
    expect(list.json().total).toBe(1);
  });

  it('updates application status (no transition validation)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const created = await app.inject({ method: 'POST', url: '/applications/drivers', payload: { name: 'A', phone: uniquePhone() } });
    const id = created.json().id;
    // NEW → ACCEPTED directly is allowed
    const res = await app.inject({ method: 'PATCH', url: `/applications/drivers/${id}/status`, headers, payload: { status: 'ACCEPTED' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ACCEPTED');
  });

  it('PATCH unknown application → 404', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'PATCH', url: '/applications/partners/00000000-0000-0000-0000-000000000000/status', headers, payload: { status: 'REJECTED' } });
    expect(res.statusCode).toBe(404);
  });
});
