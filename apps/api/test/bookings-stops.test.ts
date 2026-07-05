import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeClientRow, makeRoute, makeFlight, makeBookingRow, hoursFromNow, uniquePhone } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

// Create an admin booking through the API so its money (total) is consistent.
async function adminBooking(opts: { price?: number; pax?: number; status?: string; stops?: unknown[] } = {}) {
  const app = await getApp();
  const { headers } = await makeUser({ role: 'admin' });
  const route = await makeRoute({ price: opts.price ?? 100_000 });
  const flight = await makeFlight({ routeId: route.id, departAt: hoursFromNow(48) });
  const res = await app.inject({
    method: 'POST', url: '/bookings/admin', headers,
    payload: { flightId: flight.id, pax: opts.pax ?? 1, name: 'X', phone: uniquePhone(), status: opts.status ?? 'CONFIRMED', stops: opts.stops ?? [] },
  });
  return { app, headers, flight, route, booking: res.json(), createStatus: res.statusCode };
}

describe('Booking stops on create (assertStopsWithinPax)', () => {
  it('public booking accepts pickup/dropoff points (price starts null)', async () => {
    const app = await getApp();
    const flight = await makeFlight();
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: {
      flightId: flight.id, pax: 2, name: 'Гость', phone: uniquePhone(),
      stops: [{ kind: 'PICKUP', address: 'ул. Ленина 1' }, { kind: 'DROPOFF', address: 'ТЦ Дордой' }],
    } });
    expect(res.statusCode).toBe(201);
    const stops = await prisma.bookingStop.findMany({ where: { bookingId: res.json().id } });
    expect(stops).toHaveLength(2);
    expect(stops.every((s) => s.price === null)).toBe(true); // public flow never prices
  });

  it('rejects more points of one type than passengers → 400', async () => {
    const app = await getApp();
    const flight = await makeFlight();
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: {
      flightId: flight.id, pax: 1, name: 'X', phone: uniquePhone(),
      stops: [{ kind: 'PICKUP', address: 'A' }, { kind: 'PICKUP', address: 'B' }],
    } });
    expect(res.statusCode).toBe(400);
  });

  it('admin booking may price points immediately, and the price joins the total', async () => {
    const { createStatus, booking } = await adminBooking({ price: 100_000, pax: 1, stops: [{ kind: 'PICKUP', address: 'A', price: 30_000 }] });
    expect(createStatus).toBe(201);
    expect(booking.total).toBe(130_000); // 100000 (seat) + 30000 (stop)
  });
});

describe('Admin stop endpoints (/bookings/:id/stops)', () => {
  it('POST adds a priced stop and recomputes the total', async () => {
    const { app, headers, booking } = await adminBooking({ price: 100_000, pax: 1 });
    expect(booking.total).toBe(100_000);
    const res = await app.inject({ method: 'POST', url: `/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'Аэропорт', price: 50_000 } });
    expect(res.statusCode).toBe(201);
    expect(res.json().total).toBe(150_000);
  });

  it('more stops of one type than pax → 409 TOO_MANY_STOPS', async () => {
    const { app, headers, booking } = await adminBooking({ pax: 1 });
    await app.inject({ method: 'POST', url: `/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'A' } });
    const res = await app.inject({ method: 'POST', url: `/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'B' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('TOO_MANY_STOPS');
  });

  it('PATCH updates a stop price → total follows', async () => {
    const { app, headers, booking } = await adminBooking({ price: 100_000, pax: 1 });
    const created = await app.inject({ method: 'POST', url: `/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'A', price: 20_000 } });
    const stopId = (await prisma.bookingStop.findFirst({ where: { bookingId: booking.id } }))!.id;
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/stops/${stopId}`, headers, payload: { price: 70_000 } });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(170_000);
    void created;
  });

  it('DELETE removes a stop and its price leaves the total', async () => {
    const { app, headers, booking } = await adminBooking({ price: 100_000, pax: 1 });
    await app.inject({ method: 'POST', url: `/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'A', price: 40_000 } });
    const stopId = (await prisma.bookingStop.findFirst({ where: { bookingId: booking.id } }))!.id;
    const res = await app.inject({ method: 'DELETE', url: `/bookings/${booking.id}/stops/${stopId}`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(100_000);
  });
});

describe('Client stop endpoints (/me/bookings/:id/stops)', () => {
  it('client adds a stop (price is always null for clients)', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight({ departAt: hoursFromNow(48) });
    const booking = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'NEW', pax: 2 });
    const res = await app.inject({ method: 'POST', url: `/me/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'Дом' } });
    expect(res.statusCode).toBe(201);
    const stop = await prisma.bookingStop.findFirst({ where: { bookingId: booking.id } });
    expect(stop?.price).toBeNull();
  });

  it('client editing the address resets a confirmed price to null (needs re-confirm)', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const admin = await makeUser({ role: 'admin' });
    const flight = await makeFlight({ departAt: hoursFromNow(48) });
    const booking = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED', pax: 1 });
    // admin creates a priced stop
    await app.inject({ method: 'POST', url: `/bookings/${booking.id}/stops`, headers: admin.headers, payload: { kind: 'PICKUP', address: 'A', price: 50_000 } });
    const stopId = (await prisma.bookingStop.findFirst({ where: { bookingId: booking.id } }))!.id;
    // client changes the address → price must reset
    await app.inject({ method: 'PATCH', url: `/me/bookings/${booking.id}/stops/${stopId}`, headers, payload: { address: 'B' } });
    expect((await prisma.bookingStop.findUnique({ where: { id: stopId } }))?.price).toBeNull();
  });

  it('a completed booking is locked for client stop edits → 409 STOPS_LOCKED', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight({ status: 'COMPLETED', departAt: hoursFromNow(48) });
    const booking = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'COMPLETED', pax: 1 });
    const res = await app.inject({ method: 'POST', url: `/me/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'A' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('STOPS_LOCKED');
  });

  it('a departed trip blocks client stop edits → 409 TOO_LATE', async () => {
    const app = await getApp();
    const { client, headers } = await makeClientRow();
    const flight = await makeFlight({ departAt: hoursFromNow(-2) });
    const booking = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED', pax: 1 });
    const res = await app.inject({ method: 'POST', url: `/me/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'A' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('TOO_LATE');
  });

  it('another client’s booking → 404', async () => {
    const app = await getApp();
    const { headers } = await makeClientRow();
    const other = await makeClientRow();
    const flight = await makeFlight({ departAt: hoursFromNow(48) });
    const booking = await makeBookingRow({ clientId: other.client.id, flightId: flight.id, status: 'NEW', pax: 1 });
    const res = await app.inject({ method: 'POST', url: `/me/bookings/${booking.id}/stops`, headers, payload: { kind: 'PICKUP', address: 'A' } });
    expect(res.statusCode).toBe(404);
  });
});
