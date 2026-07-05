import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeRoute } from './helpers/factories.js';

describe('GET /routes/public', () => {
  it('returns only ACTIVE routes, cheapest first, no auth', async () => {
    const app = await getApp();
    await makeRoute({ fromCity: 'Бишкек', toCity: 'Алматы', price: 500_000, status: 'ACTIVE' });
    await makeRoute({ fromCity: 'Бишкек', toCity: 'Каракол', price: 200_000, status: 'ACTIVE' });
    await makeRoute({ fromCity: 'Бишкек', toCity: 'Ош', price: 100_000, status: 'DRAFT' });

    const res = await app.inject({ method: 'GET', url: '/routes/public' });
    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list).toHaveLength(2); // DRAFT excluded
    expect(list[0].price).toBeLessThanOrEqual(list[1].price); // sorted asc
  });
});

describe('GET /routes (back-office)', () => {
  it('requires a back-office token', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/routes' })).statusCode).toBe(401);
  });

  it('operator can list', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    await makeRoute();
    const res = await app.inject({ method: 'GET', url: '/routes', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(1);
  });

  it('GET /routes/:id 404 for unknown', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'GET', url: '/routes/00000000-0000-0000-0000-000000000000', headers });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /routes', () => {
  it('admin creates a route → 201', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const res = await app.inject({ method: 'POST', url: '/routes', headers, payload: { fromCity: 'Бишкек', toCity: 'Алматы', durationLabel: '4 часа', price: 350_000 } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ fromCity: 'Бишкек', toCity: 'Алматы', status: 'ACTIVE' });
  });

  it('operator is forbidden from creating → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'POST', url: '/routes', headers, payload: { fromCity: 'Бишкек', toCity: 'Ош', durationLabel: '10 часов', price: 900_000 } });
    expect(res.statusCode).toBe(403);
  });

  it('duplicate (fromCity,toCity) → 409 CONFLICT', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'owner' });
    await makeRoute({ fromCity: 'Бишкек', toCity: 'Нарын' });
    const res = await app.inject({ method: 'POST', url: '/routes', headers, payload: { fromCity: 'Бишкек', toCity: 'Нарын', durationLabel: '5 часов', price: 400_000 } });
    expect(res.statusCode).toBe(409);
  });

  it('negative price → 422', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const res = await app.inject({ method: 'POST', url: '/routes', headers, payload: { fromCity: 'A', toCity: 'B', durationLabel: 'x', price: -1 } });
    expect(res.statusCode).toBe(422);
  });
});

describe('PATCH + DELETE /routes/:id', () => {
  it('admin patches price', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const route = await makeRoute({ price: 350_000 });
    const res = await app.inject({ method: 'PATCH', url: `/routes/${route.id}`, headers, payload: { price: 400_000 } });
    expect(res.statusCode).toBe(200);
    expect(res.json().price).toBe(400_000);
  });

  it('DELETE soft-archives the route (status ARCHIVED), not a hard delete', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'owner' });
    const route = await makeRoute();
    const res = await app.inject({ method: 'DELETE', url: `/routes/${route.id}`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ARCHIVED');
    // still queryable in the back-office list
    const list = await app.inject({ method: 'GET', url: '/routes', headers });
    expect(list.json().find((r: { id: string }) => r.id === route.id)?.status).toBe('ARCHIVED');
  });

  it('operator cannot delete → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const route = await makeRoute();
    const res = await app.inject({ method: 'DELETE', url: `/routes/${route.id}`, headers });
    expect(res.statusCode).toBe(403);
  });
});
