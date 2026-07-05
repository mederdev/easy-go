import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeClientRow, makeFlight, makeBookingRow, uniquePhone } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

describe('GET /clients', () => {
  it('requires operator+; paginates and searches by name/phone', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/clients' })).statusCode).toBe(401);

    const { headers } = await makeUser({ role: 'operator' });
    await makeClientRow({ name: 'Азамат' });
    await makeClientRow({ name: 'Бакыт' });
    const all = await app.inject({ method: 'GET', url: '/clients', headers });
    expect(all.json().total).toBe(2);
    const search = await app.inject({ method: 'GET', url: '/clients?search=Азам', headers });
    expect(search.json().total).toBe(1);
  });

  it('GET /clients/:id unknown → 404; non-uuid → 422', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    expect((await app.inject({ method: 'GET', url: '/clients/00000000-0000-0000-0000-000000000000', headers })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/clients/nope', headers })).statusCode).toBe(422);
  });
});

describe('POST /clients', () => {
  it('operator can create; phone is normalized', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'POST', url: '/clients', headers, payload: { name: 'Новый', phone: '996 700 42 42 42' } });
    expect(res.statusCode).toBe(201);
    expect(res.json().phone).toBe('+996700424242');
  });

  it('duplicate phone → 409 CONFLICT', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const phone = uniquePhone();
    await makeClientRow({ phone });
    const res = await app.inject({ method: 'POST', url: '/clients', headers, payload: { name: 'Дубль', phone } });
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /clients/:id/set-password (admin/owner)', () => {
  it('operator is forbidden → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const { client } = await makeClientRow();
    const res = await app.inject({ method: 'POST', url: `/clients/${client.id}/set-password`, headers, payload: { password: 'newpass1' } });
    expect(res.statusCode).toBe(403);
  });

  it('admin sets password + plaintext copy → 204', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { client } = await makeClientRow();
    const res = await app.inject({ method: 'POST', url: `/clients/${client.id}/set-password`, headers, payload: { password: 'newpass1' } });
    expect(res.statusCode).toBe(204);
    const row = await prisma.client.findUnique({ where: { id: client.id } });
    expect(row?.passwordRaw).toBe('newpass1');
    expect(row?.passwordHash).toBeTruthy();
  });
});

describe('DELETE /clients/:id (admin/owner)', () => {
  it('operator is forbidden → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const { client } = await makeClientRow();
    expect((await app.inject({ method: 'DELETE', url: `/clients/${client.id}`, headers })).statusCode).toBe(403);
  });

  it('deletes a client with no bookings → 204', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { client } = await makeClientRow();
    const res = await app.inject({ method: 'DELETE', url: `/clients/${client.id}`, headers });
    expect(res.statusCode).toBe(204);
    expect(await prisma.client.findUnique({ where: { id: client.id } })).toBeNull();
  });

  it('a client WITH bookings cannot be deleted → 409 CLIENT_HAS_BOOKINGS', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'owner' });
    const { client } = await makeClientRow();
    const flight = await makeFlight();
    await makeBookingRow({ clientId: client.id, flightId: flight.id });
    const res = await app.inject({ method: 'DELETE', url: `/clients/${client.id}`, headers });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CLIENT_HAS_BOOKINGS');
    // still present
    expect(await prisma.client.findUnique({ where: { id: client.id } })).not.toBeNull();
  });
});
