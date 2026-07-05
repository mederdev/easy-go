import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeRoute, makeFlight, uniquePhone } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

// Arrange a booking through the real admin API so counters are accurate, then
// exercise transitions and assert the denormalized counters straight from the DB.
async function arrange(opts: { seatsTotal?: number; price?: number; pax?: number; status?: string } = {}) {
  const app = await getApp();
  const { headers } = await makeUser({ role: 'admin' });
  const route = await makeRoute({ price: opts.price ?? 350_000 });
  const flight = await makeFlight({ routeId: route.id, seatsTotal: opts.seatsTotal ?? 11 });
  const phone = uniquePhone();
  const create = await app.inject({
    method: 'POST',
    url: '/bookings/admin',
    headers,
    payload: { flightId: flight.id, pax: opts.pax ?? 2, name: 'Клиент', phone, status: opts.status ?? 'NEW' },
  });
  const booking = create.json();
  return { app, headers, flight, phone, booking };
}

const flightOf = (id: string) => prisma.flight.findUnique({ where: { id } });
const clientOf = (phone: string) => prisma.client.findUnique({ where: { phone } });

describe('PATCH /bookings/:id/status — attach (NEW → CONFIRMED)', () => {
  it('reserves seats and bumps trip counters', async () => {
    const { app, headers, flight, phone, booking } = await arrange({ pax: 2 });
    expect((await flightOf(flight.id))?.seatsTaken).toBe(0);

    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CONFIRMED' } });
    expect(res.statusCode).toBe(200);

    expect((await flightOf(flight.id))?.seatsTaken).toBe(2);
    const c = await clientOf(phone);
    expect(c?.tripsCount).toBe(1);
    expect(c?.totalSum).toBe(700_000); // 350000 * 2
  });

  it('confirming beyond capacity is rejected at confirmation time → NOT_ENOUGH_SEATS', async () => {
    const { app, headers, flight, booking } = await arrange({ seatsTotal: 4, pax: 5 });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CONFIRMED' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('NOT_ENOUGH_SEATS');
    expect((await flightOf(flight.id))?.seatsTaken).toBe(0);
  });
});

describe('PATCH /bookings/:id/status — detach (CONFIRMED → CANCELLED)', () => {
  it('frees seats, reopens a full flight, and rolls back trip counters', async () => {
    const { app, headers, flight, phone, booking } = await arrange({ seatsTotal: 2, pax: 2, status: 'CONFIRMED' });
    // arranged as CONFIRMED → flight filled and auto-CLOSED
    expect((await flightOf(flight.id))?.status).toBe('CLOSED');
    expect((await flightOf(flight.id))?.seatsTaken).toBe(2);

    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CANCELLED' } });
    expect(res.statusCode).toBe(200);

    const f = await flightOf(flight.id);
    expect(f?.seatsTaken).toBe(0);
    expect(f?.status).toBe('SCHEDULED'); // reopened
    const c = await clientOf(phone);
    expect(c?.tripsCount).toBe(0);
    expect(c?.totalSum).toBe(0);
  });
});

describe('PATCH /bookings/:id/status — no boundary crossing', () => {
  it('CONFIRMED → COMPLETED leaves seats and counters untouched', async () => {
    const { app, headers, flight, phone, booking } = await arrange({ pax: 3, status: 'CONFIRMED' });
    const before = await flightOf(flight.id);
    // a booking can only be completed once its flight has completed
    await prisma.flight.update({ where: { id: flight.id }, data: { status: 'COMPLETED' } });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'COMPLETED' } });
    expect(res.statusCode).toBe(200);
    expect((await flightOf(flight.id))?.seatsTaken).toBe(before?.seatsTaken);
    expect((await clientOf(phone))?.tripsCount).toBe(1);
  });

  it('setting the same status is a no-op', async () => {
    const { app, headers, phone, booking } = await arrange({ status: 'CONFIRMED', pax: 2 });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CONFIRMED' } });
    expect(res.statusCode).toBe(200);
    expect((await clientOf(phone))?.tripsCount).toBe(1); // still 1, not 2
  });

  it('NEW → CANCELLED (both non-holding) touches no counters', async () => {
    const { app, headers, flight, phone, booking } = await arrange({ pax: 2, status: 'NEW' });
    await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CANCELLED' } });
    expect((await flightOf(flight.id))?.seatsTaken).toBe(0);
    expect((await clientOf(phone))?.tripsCount).toBe(0);
  });
});

describe('Illegal transitions are rejected (fixed desync #3)', () => {
  it('COMPLETED → NEW is refused with 400 and leaves counters intact', async () => {
    const { app, headers, flight, phone, booking } = await arrange({ pax: 2, status: 'CONFIRMED' });
    await prisma.flight.update({ where: { id: flight.id }, data: { status: 'COMPLETED' } });
    await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'COMPLETED' } });
    expect((await flightOf(flight.id))?.seatsTaken).toBe(2);

    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'NEW' } });
    expect(res.statusCode).toBe(400);
    // no detach happened — seats and counters unchanged
    expect((await flightOf(flight.id))?.seatsTaken).toBe(2);
    expect((await clientOf(phone))?.tripsCount).toBe(1);
    expect((await prisma.booking.findUnique({ where: { id: booking.id } }))?.status).toBe('COMPLETED');
  });

  it('reviving a cancelled booking (CANCELLED → CONFIRMED) is refused with 400', async () => {
    const { app, headers, booking } = await arrange({ pax: 2, status: 'NEW' });
    await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CANCELLED' } });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CONFIRMED' } });
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /bookings/:id/payment (money edit)', () => {
  it('recomputes total and syncs the client lifetime total (holding booking)', async () => {
    const { app, headers, phone, booking } = await arrange({ price: 350_000, pax: 2, status: 'CONFIRMED' });
    expect((await clientOf(phone))?.totalSum).toBe(700_000);

    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { discount: 100_000 } });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(600_000); // 700000 - 100000
    expect((await clientOf(phone))?.totalSum).toBe(600_000); // synced by delta
  });

  it('requires at least one of discount/prepaid → 422', async () => {
    const { app, headers, booking } = await arrange({ status: 'CONFIRMED' });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: {} });
    expect(res.statusCode).toBe(422);
  });

  it('a NEW (non-holding) booking money edit does NOT move client totalSum', async () => {
    const { app, headers, phone, booking } = await arrange({ status: 'NEW', pax: 2 });
    await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment`, headers, payload: { prepaid: 10_000 } });
    expect((await clientOf(phone))?.totalSum).toBe(0);
  });
});

describe('PATCH /bookings/:id/payment-status', () => {
  it('marks a booking PAID without touching amounts', async () => {
    const { app, headers, booking } = await arrange({ status: 'CONFIRMED' });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment-status`, headers, payload: { status: 'PAID' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().paymentStatus).toBe('PAID');
  });

  it('accepts PARTIAL and re-derives from stored amounts (unlike the flight endpoint)', async () => {
    const { app, headers, booking } = await arrange({ status: 'CONFIRMED' });
    const res = await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment-status`, headers, payload: { status: 'PARTIAL' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().paymentStatus).toBe('UNPAID'); // prepaid=0 → derives UNPAID
  });
});
