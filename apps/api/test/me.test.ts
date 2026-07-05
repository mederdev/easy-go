import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeClientRow, makeFlight, makeBookingRow, hoursFromNow, uniquePhone } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

describe('GET/PATCH /me', () => {
  it('returns the authenticated client profile', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow({ name: 'Нурлан' });
    const res = await app.inject({ method: 'GET', url: '/me', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: client.id, name: 'Нурлан' });
    expect(res.json().passwordHash).toBeUndefined();
  });

  it('no token → 401', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/me' })).statusCode).toBe(401);
  });

  it('PATCH /me updates name + whatsapp but never the phone', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow({ name: 'Старое', whatsapp: true });
    const res = await app.inject({ method: 'PATCH', url: '/me', headers, payload: { name: 'Новое', whatsapp: false, phone: '+996000000000' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: 'Новое', whatsapp: false, phone: client.phone });
  });
});

describe('PATCH /me/password', () => {
  it('sets a password with no current-password check and enables login', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow(); // telegram-only, no password
    const set = await app.inject({ method: 'PATCH', url: '/me/password', headers, payload: { password: 'brandnew1' } });
    expect(set.statusCode).toBe(200);
    const login = await app.inject({ method: 'POST', url: '/client-auth/login', payload: { phone: client.phone, password: 'brandnew1' } });
    expect(login.statusCode).toBe(200);
  });

  it('wipes any admin-set plaintext password', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    await prisma.client.update({ where: { id: client.id }, data: { passwordRaw: 'plain' } });
    await app.inject({ method: 'PATCH', url: '/me/password', headers, payload: { password: 'brandnew1' } });
    const row = await prisma.client.findUnique({ where: { id: client.id } });
    expect(row?.passwordRaw).toBeNull();
  });
});

describe('GET /me/bookings', () => {
  it('lists only the client’s own bookings, paginated', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const other = await makeClientRow();
    const flight = await makeFlight();
    await makeBookingRow({ clientId: client.id, flightId: flight.id });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED' });
    await makeBookingRow({ clientId: other.client.id, flightId: flight.id });

    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(2);
    expect(body.items).toHaveLength(2);
    expect(body.items.every((b: { clientId: string }) => b.clientId === client.id)).toBe(true);
  });

  it('filters by status', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight();
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'NEW' });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED' });
    const res = await app.inject({ method: 'GET', url: '/me/bookings?status=CONFIRMED', headers });
    expect(res.json().total).toBe(1);
    expect(res.json().items[0].status).toBe('CONFIRMED');
  });
});

describe('GET /me/bookings/:id', () => {
  it('returns own booking', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight();
    const b = await makeBookingRow({ clientId: client.id, flightId: flight.id });
    const res = await app.inject({ method: 'GET', url: `/me/bookings/${b.id}`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(b.id);
  });

  it('another client’s booking → 404 (no ownership leak)', async () => {
    const app = await getApp();
    const { headers } = await makeClientRow();
    const other = await makeClientRow();
    const flight = await makeFlight();
    const b = await makeBookingRow({ clientId: other.client.id, flightId: flight.id });
    const res = await app.inject({ method: 'GET', url: `/me/bookings/${b.id}`, headers });
    expect(res.statusCode).toBe(404);
  });

  it('non-uuid id → 422', async () => {
    const app = await getApp();
    const { headers } = await makeClientRow();
    const res = await app.inject({ method: 'GET', url: '/me/bookings/not-a-uuid', headers });
    expect(res.statusCode).toBe(422);
  });
});

describe('PATCH /me/bookings/:id/cancel', () => {
  it('cancels a cancellable future booking → CANCELLED', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight({ departAt: hoursFromNow(48) });
    const b = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'NEW' });
    const res = await app.inject({ method: 'PATCH', url: `/me/bookings/${b.id}/cancel`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('CANCELLED');
  });

  it('a completed trip cannot be cancelled → 409 NOT_CANCELLABLE', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight({ departAt: hoursFromNow(48) });
    const b = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'COMPLETED' });
    const res = await app.inject({ method: 'PATCH', url: `/me/bookings/${b.id}/cancel`, headers });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('NOT_CANCELLABLE');
  });

  it('a departed trip cannot be cancelled → 409 TOO_LATE', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight({ departAt: hoursFromNow(-2) }); // already left
    const b = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED' });
    const res = await app.inject({ method: 'PATCH', url: `/me/bookings/${b.id}/cancel`, headers });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('TOO_LATE');
  });

  it('another client’s booking → 404', async () => {
    const app = await getApp();
    const { headers } = await makeClientRow();
    const other = await makeClientRow();
    const flight = await makeFlight({ departAt: hoursFromNow(48) });
    const b = await makeBookingRow({ clientId: other.client.id, flightId: flight.id });
    const res = await app.inject({ method: 'PATCH', url: `/me/bookings/${b.id}/cancel`, headers });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /me/custom-requests', () => {
  it('matches custom requests by the client’s phone', async () => {
    const app = await getApp();
    const phone = uniquePhone();
    const { headers } = await makeClientRow({ phone });
    await app.inject({ method: 'POST', url: '/custom-requests', payload: { fromCity: 'Бишкек', toCity: 'Каракол', date: '2026-08-01', pax: 3, phone } });
    const res = await app.inject({ method: 'GET', url: '/me/custom-requests', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(1);
    expect(res.json().items[0].fromCity).toBe('Бишкек');
  });

  it('a phone-less (telegram) client gets an empty list', async () => {
    const app = await getApp();
    const { headers } = await makeClientRow({ phone: null });
    const res = await app.inject({ method: 'GET', url: '/me/custom-requests', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(0);
  });
});
