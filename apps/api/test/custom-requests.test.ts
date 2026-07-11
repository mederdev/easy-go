import { describe, it, expect } from 'vitest';
import { getApp, idemKey } from './helpers/app.js';
import { makeUser, makeClientRow, uniquePhone } from './helpers/factories.js';

describe('POST /custom-requests (public, idempotent)', () => {
  it('accepts a custom request → 201 NEW; phone normalized', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Каракол', date: '2026-08-15', time: '09:30', pax: 4, phone: '996 700 11 22 33', wholeCabin: true } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ status: 'NEW', phone: '+996700112233', wholeCabin: true });
  });

  it('bad time format → 422', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'A', toCity: 'B', date: '2026-08-15', time: '9:3', pax: 1, phone: uniquePhone() } });
    expect(res.statusCode).toBe(422);
  });

  it('replays under an idempotency key', async () => {
    const app = await getApp();
    const payload = { fromCity: 'Бишкек', toCity: 'Ош', date: '2026-08-15', pax: 2, phone: uniquePhone() };
    const key = 'cr-idem-1';
    const a = await app.inject({ method: 'POST', url: '/custom-requests', payload, headers: idemKey(key) });
    const b = await app.inject({ method: 'POST', url: '/custom-requests', payload, headers: idemKey(key) });
    expect(b.headers['idempotent-replay']).toBe('true');
    expect(b.json().id).toBe(a.json().id);
  });

  it('accepts feature add-ons and pickup/dropoff points (their feature)', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/custom-requests', payload: {
      fromCity: 'Бишкек', toCity: 'Ош', date: '2026-08-15', pax: 2, phone: uniquePhone(),
      features: ['CHILD_SEAT'], stops: [{ kind: 'PICKUP', address: 'Дом' }],
    } });
    expect(res.statusCode).toBe(201);
    expect(res.json().features).toContain('CHILD_SEAT');
  });

  it('rejects more points of one type than passengers → 400', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/custom-requests', payload: {
      fromCity: 'Бишкек', toCity: 'Ош', date: '2026-08-15', pax: 1, phone: uniquePhone(),
      stops: [{ kind: 'PICKUP', address: 'A' }, { kind: 'PICKUP', address: 'B' }],
    } });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /custom-requests (operator+)', () => {
  it('requires a token', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/custom-requests' })).statusCode).toBe(401);
  });

  it('enriches items with the matching clientName by phone', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const phone = uniquePhone();
    await makeClientRow({ name: 'Известный', phone });
    await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Нарын', date: '2026-08-20', pax: 1, phone } });
    const res = await app.inject({ method: 'GET', url: '/custom-requests', headers });
    expect(res.json().items[0].clientName).toBe('Известный');
  });

  it('clientName is null when no client matches the phone', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Талас', date: '2026-08-20', pax: 1, phone: uniquePhone() } });
    const res = await app.inject({ method: 'GET', url: '/custom-requests', headers });
    expect(res.json().items[0].clientName).toBeNull();
  });
});

describe('PATCH /custom-requests/:id/status', () => {
  it('unknown (well-formed) id → 404', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'PATCH', url: '/custom-requests/00000000-0000-0000-0000-000000000000/status', headers, payload: { status: 'ACCEPTED' } });
    expect(res.statusCode).toBe(404);
  });

  it('non-uuid id → 422, not 500 (fixed desync #7)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'PATCH', url: '/custom-requests/not-a-uuid/status', headers, payload: { status: 'ACCEPTED' } });
    expect(res.statusCode).toBe(422);
  });

  it('updates status of an existing request', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const created = await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Ош', date: '2026-08-25', pax: 1, phone: uniquePhone() } });
    const res = await app.inject({ method: 'PATCH', url: `/custom-requests/${created.json().id}/status`, headers, payload: { status: 'REVIEWING' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('REVIEWING');
  });
});

describe('PATCH /custom-requests/:id — mark paid guard', () => {
  it('rejects PAID while not accepted → 400', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const created = await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Ош', date: '2026-08-25', pax: 1, phone: uniquePhone() } });
    const id = created.json().id;
    // Quote it (total > 0) but leave status NEW.
    await app.inject({ method: 'PATCH', url: `/custom-requests/${id}`, headers, payload: { unitPrice: 100000 } });
    const res = await app.inject({ method: 'PATCH', url: `/custom-requests/${id}`, headers, payload: { paymentStatus: 'PAID' } });
    expect(res.statusCode).toBe(400);
  });

  it('rejects PAID when accepted but total is 0 → 400', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const created = await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Ош', date: '2026-08-25', pax: 1, phone: uniquePhone() } });
    const id = created.json().id;
    await app.inject({ method: 'PATCH', url: `/custom-requests/${id}/status`, headers, payload: { status: 'ACCEPTED' } });
    const res = await app.inject({ method: 'PATCH', url: `/custom-requests/${id}`, headers, payload: { paymentStatus: 'PAID' } });
    expect(res.statusCode).toBe(400);
  });

  it('allows PAID once accepted with a final price', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const created = await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Ош', date: '2026-08-25', pax: 1, phone: uniquePhone() } });
    const id = created.json().id;
    await app.inject({ method: 'PATCH', url: `/custom-requests/${id}`, headers, payload: { unitPrice: 100000 } });
    await app.inject({ method: 'PATCH', url: `/custom-requests/${id}/status`, headers, payload: { status: 'ACCEPTED' } });
    const res = await app.inject({ method: 'PATCH', url: `/custom-requests/${id}`, headers, payload: { paymentStatus: 'PAID' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().paymentStatus).toBe('PAID');
  });
});
