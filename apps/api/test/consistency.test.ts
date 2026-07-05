import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeDriver, makeRoute, makeFlight, uniquePhone, hoursFromNow } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

// ── Invariants that must hold no matter which role acted ──
// A booking "holds" a seat iff status ∈ {CONFIRMED, COMPLETED}.

const HOLDING = ['CONFIRMED', 'COMPLETED'];

async function assertFlightConsistent(flightId: string) {
  const flight = await prisma.flight.findUnique({ where: { id: flightId } });
  const bookings = await prisma.booking.findMany({ where: { flightId } });
  const holding = bookings.filter((b) => HOLDING.includes(b.status));

  // seatsTaken == Σ pax of holding bookings
  const expectedSeats = holding.reduce((s, b) => s + b.pax, 0);
  expect(flight!.seatsTaken, 'flight.seatsTaken vs Σ pax(holding)').toBe(expectedSeats);

  // paymentStatus == aggregate over holding bookings
  let expectedPay = 'UNPAID';
  if (holding.length > 0) {
    const allPaid = holding.every((b) => b.paymentStatus === 'PAID');
    const allUnpaid = holding.every((b) => b.paymentStatus === 'UNPAID');
    expectedPay = allPaid ? 'PAID' : allUnpaid ? 'UNPAID' : 'PARTIAL';
  }
  expect(flight!.paymentStatus, 'flight.paymentStatus vs aggregate').toBe(expectedPay);

  // a SCHEDULED/CLOSED flight's CLOSED-ness must match capacity
  if (flight!.status === 'CLOSED') expect(flight!.seatsTaken).toBeGreaterThanOrEqual(flight!.seatsTotal);
}

async function assertClientConsistent(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  const holding = await prisma.booking.findMany({ where: { clientId, status: { in: HOLDING as never } } });
  expect(client!.tripsCount, 'client.tripsCount vs #holding').toBe(holding.length);
  expect(client!.totalSum, 'client.totalSum vs Σ total(holding)').toBe(holding.reduce((s, b) => s + b.total, 0));
}

describe('End-to-end lifecycle: client → admin → driver stays consistent', () => {
  it('book (NEW) → confirm → pay → depart → complete', async () => {
    const app = await getApp();
    const admin = await makeUser({ role: 'admin' });
    const { driver, car } = await makeDriver({ withCar: true });
    const route = await makeRoute({ price: 350_000 });
    // depart time in the past so the driver can mark it DEPARTED
    const flight = await makeFlight({ routeId: route.id, carId: car!.id, seatsTotal: 11, departAt: hoursFromNow(-1) });
    const driverToken = await (await import('./helpers/app.js')).driverToken(driver.id);
    const driverHeaders = { authorization: `Bearer ${driverToken}` };
    const phone = uniquePhone();

    // 1) Customer books publicly → NEW, holds nothing
    const created = await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 3, name: 'Клиент', phone } });
    const booking = created.json();
    const clientId = booking.clientId;
    await assertFlightConsistent(flight.id);
    await assertClientConsistent(clientId);
    expect((await prisma.flight.findUnique({ where: { id: flight.id } }))!.seatsTaken).toBe(0);

    // 2) Operator confirms → attaches, reserves 3 seats
    await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers: admin.headers, payload: { status: 'CONFIRMED' } });
    await assertFlightConsistent(flight.id);
    await assertClientConsistent(clientId);
    expect((await prisma.flight.findUnique({ where: { id: flight.id } }))!.seatsTaken).toBe(3);

    // 3) Mark the booking PAID → flight aggregate becomes PAID
    await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/payment-status`, headers: admin.headers, payload: { status: 'PAID' } });
    await assertFlightConsistent(flight.id);
    expect((await prisma.flight.findUnique({ where: { id: flight.id } }))!.paymentStatus).toBe('PAID');

    // 4) Driver departs → seats unchanged
    await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/status`, headers: driverHeaders, payload: { status: 'DEPARTED' } });
    await assertFlightConsistent(flight.id);

    // 5) Driver completes → CONFIRMED booking cascades to COMPLETED, still holding
    await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/status`, headers: driverHeaders, payload: { status: 'COMPLETED' } });
    await assertFlightConsistent(flight.id);
    await assertClientConsistent(clientId);
    expect((await prisma.booking.findUnique({ where: { id: booking.id } }))!.status).toBe('COMPLETED');
    expect((await prisma.client.findUnique({ where: { id: clientId } }))!.tripsCount).toBe(1);
  });
});

describe('Multiple bookings + partial cancellation stay consistent', () => {
  it('two confirmed passengers, then one cancels — seats and totals track exactly', async () => {
    const app = await getApp();
    const admin = await makeUser({ role: 'admin' });
    const flight = await makeFlight({ seatsTotal: 5 });

    const p1 = uniquePhone();
    const p2 = uniquePhone();
    const b1 = (await app.inject({ method: 'POST', url: '/bookings/admin', headers: admin.headers, payload: { flightId: flight.id, pax: 2, name: 'A', phone: p1, status: 'CONFIRMED' } })).json();
    const b2 = (await app.inject({ method: 'POST', url: '/bookings/admin', headers: admin.headers, payload: { flightId: flight.id, pax: 3, name: 'B', phone: p2, status: 'CONFIRMED' } })).json();

    // flight is now full (2+3=5) → auto-CLOSED
    expect((await prisma.flight.findUnique({ where: { id: flight.id } }))!.status).toBe('CLOSED');
    await assertFlightConsistent(flight.id);

    // cancel b1 → frees 2 seats, reopens the flight
    await app.inject({ method: 'PATCH', url: `/bookings/${b1.id}/status`, headers: admin.headers, payload: { status: 'CANCELLED' } });
    const f = await prisma.flight.findUnique({ where: { id: flight.id } });
    expect(f!.seatsTaken).toBe(3);
    expect(f!.status).toBe('SCHEDULED');
    await assertFlightConsistent(flight.id);
    await assertClientConsistent(b1.clientId);
    await assertClientConsistent(b2.clientId);
  });
});

describe('Flight cancellation releases seats and cancels bookings (fixed desync #1)', () => {
  it('admin cancelling a flight frees seats, cancels its bookings and rolls back counters', async () => {
    const app = await getApp();
    const admin = await makeUser({ role: 'admin' });
    const flight = await makeFlight({ seatsTotal: 11 });
    const phone = uniquePhone();
    const booking = (await app.inject({ method: 'POST', url: '/bookings/admin', headers: admin.headers, payload: { flightId: flight.id, pax: 3, name: 'A', phone, status: 'CONFIRMED' } })).json();
    expect((await prisma.flight.findUnique({ where: { id: flight.id } }))!.seatsTaken).toBe(3);

    // Admin cancels the whole flight via the generic status PATCH.
    await app.inject({ method: 'PATCH', url: `/flights/${flight.id}`, headers: admin.headers, payload: { status: 'CANCELLED_BY_COMPANY' } });

    const f = await prisma.flight.findUnique({ where: { id: flight.id } });
    const b = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(f!.seatsTaken).toBe(0); // seats freed
    expect(b!.status).toBe('CANCELLED_BY_COMPANY'); // booking cancelled
    expect((await prisma.client.findUnique({ where: { id: booking.clientId } }))!.tripsCount).toBe(0); // rolled back
    // and the whole flight is internally consistent afterwards
    await assertFlightConsistent(flight.id);
    await assertClientConsistent(booking.clientId);
  });

  it('a NEW (unconfirmed) request on a cancelled flight is also cancelled', async () => {
    const app = await getApp();
    const admin = await makeUser({ role: 'admin' });
    const flight = await makeFlight({ seatsTotal: 11 });
    const booking = (await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 2, name: 'A', phone: uniquePhone() } })).json();
    await app.inject({ method: 'PATCH', url: `/flights/${flight.id}`, headers: admin.headers, payload: { status: 'CANCELLED' } });
    expect((await prisma.booking.findUnique({ where: { id: booking.id } }))!.status).toBe('CANCELLED');
  });
});
