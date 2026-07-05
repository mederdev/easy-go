import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeRoute, makeFlight, uniquePhone, hoursFromNow } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

const flightOf = (id: string) => prisma.flight.findUnique({ where: { id } });
const clientOf = (phone: string) => prisma.client.findUnique({ where: { phone } });

async function confirmedBooking(opts: { price?: number; pax?: number; seatsTotal?: number; unitPrice?: number } = {}) {
  const app = await getApp();
  const { headers } = await makeUser({ role: 'admin' });
  const route = await makeRoute({ price: opts.price ?? 100_000 });
  const flight = await makeFlight({ routeId: route.id, seatsTotal: opts.seatsTotal ?? 11, departAt: hoursFromNow(48) });
  const phone = uniquePhone();
  const payload: Record<string, unknown> = { flightId: flight.id, pax: opts.pax ?? 2, name: 'X', phone, status: 'CONFIRMED' };
  if (opts.unitPrice !== undefined) payload.unitPrice = opts.unitPrice;
  const booking = (await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload })).json();
  return { app, headers, route, flight, phone, booking };
}

describe('unitPrice (per-seat override)', () => {
  it('admin booking with unitPrice overrides the route price', async () => {
    const { booking } = await confirmedBooking({ price: 100_000, pax: 2, unitPrice: 250_000 });
    expect(booking.unitPrice).toBe(250_000);
    expect(booking.total).toBe(500_000); // 250000 * 2, not the route's 100000
  });

  it('PATCH payment can set and clear unitPrice (null resets to route price)', async () => {
    const { app, headers, booking } = await confirmedBooking({ price: 100_000, pax: 2 });
    expect(booking.total).toBe(200_000);
    const set = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { unitPrice: 150_000 } });
    expect(set.json().total).toBe(300_000);
    const clear = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { unitPrice: null } });
    expect(clear.json().total).toBe(200_000); // back to route price * pax
  });
});

describe('PATCH /bookings/:id/payment — passenger count change', () => {
  it('increasing pax reserves more seats and recomputes total', async () => {
    const { app, headers, flight, phone, booking } = await confirmedBooking({ price: 100_000, pax: 2, seatsTotal: 11 });
    expect((await flightOf(flight.id))?.seatsTaken).toBe(2);

    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { pax: 3 } });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(300_000);
    expect((await flightOf(flight.id))?.seatsTaken).toBe(3); // +1 seat
    expect((await clientOf(phone))?.totalSum).toBe(300_000);
  });

  it('increasing pax beyond capacity → 409 NOT_ENOUGH_SEATS', async () => {
    const { app, headers, booking } = await confirmedBooking({ pax: 2, seatsTotal: 2 });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { pax: 3 } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('NOT_ENOUGH_SEATS');
  });
});

describe('PATCH /bookings/:id/payment — reassign to another flight', () => {
  it('moving a confirmed booking frees seats on the old flight and reserves on the new', async () => {
    const { app, headers, flight: flightA, booking } = await confirmedBooking({ price: 100_000, pax: 2, seatsTotal: 11 });
    const flightB = await makeFlight({ seatsTotal: 11, departAt: hoursFromNow(72) });
    expect((await flightOf(flightA.id))?.seatsTaken).toBe(2);

    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { flightId: flightB.id } });
    expect(res.statusCode).toBe(200);
    expect((await flightOf(flightA.id))?.seatsTaken).toBe(0); // freed
    expect((await flightOf(flightB.id))?.seatsTaken).toBe(2); // reserved
    expect(res.json().flightId).toBe(flightB.id);
  });

  it('reassigning to a non-SCHEDULED flight → 409 FLIGHT_CLOSED', async () => {
    const { app, headers, booking } = await confirmedBooking({ pax: 2 });
    const closed = await makeFlight({ status: 'CLOSED', departAt: hoursFromNow(72) });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { flightId: closed.id } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('FLIGHT_CLOSED');
  });
});
