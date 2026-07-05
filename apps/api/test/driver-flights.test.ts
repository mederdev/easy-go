import { describe, it, expect } from 'vitest';
import { getApp, bearer, clientToken } from './helpers/app.js';
import { makeDriver, makeClientRow, makeFlight, makeBookingRow, hoursFromNow } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

/** A driver who owns a car assigned to a fresh flight. */
async function driverWithFlight(flightOpts: Parameters<typeof makeFlight>[0] = {}) {
  const { driver, car, headers } = await makeDriver({ withCar: true });
  const flight = await makeFlight({ carId: car!.id, ...flightOpts });
  return { driver, car: car!, headers, flight };
}

describe('GET /driver-flights', () => {
  it('lists only the driver’s own flights', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight();
    // an unrelated flight owned by another driver
    const other = await makeDriver({ withCar: true });
    await makeFlight({ carId: other.car!.id });

    const res = await app.inject({ method: 'GET', url: '/driver-flights', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].id).toBe(flight.id);
  });

  it('no token → 401; client token → 403', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/driver-flights' })).statusCode).toBe(401);
    const { client } = await makeClientRow();
    const token = await clientToken(client.id);
    expect((await app.inject({ method: 'GET', url: '/driver-flights', headers: bearer(token) })).statusCode).toBe(403);
  });
});

describe('GET /driver-flights/:id ownership', () => {
  it('own flight → 200', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight();
    const res = await app.inject({ method: 'GET', url: `/driver-flights/${flight.id}`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(flight.id);
  });

  it('another driver’s flight → 404 (masked ownership)', async () => {
    const app = await getApp();
    const { headers } = await driverWithFlight();
    const other = await driverWithFlight();
    const res = await app.inject({ method: 'GET', url: `/driver-flights/${other.flight.id}`, headers });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /driver-flights/:id/status (guarded state machine)', () => {
  it('SCHEDULED → DEPARTED → COMPLETED is allowed', async () => {
    const app = await getApp();
    // DEPARTED is only allowed once the departure time has passed
    const { headers, flight } = await driverWithFlight({ status: 'SCHEDULED', departAt: hoursFromNow(-1) });
    const dep = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/status`, headers, payload: { status: 'DEPARTED' } });
    expect(dep.statusCode).toBe(200);
    expect(dep.json().status).toBe('DEPARTED');
    const comp = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/status`, headers, payload: { status: 'COMPLETED' } });
    expect(comp.statusCode).toBe(200);
    expect(comp.json().status).toBe('COMPLETED');
  });

  it('SCHEDULED → COMPLETED (skipping DEPARTED) → 400 BAD_REQUEST', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight({ status: 'SCHEDULED' });
    const res = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/status`, headers, payload: { status: 'COMPLETED' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });

  it('a cancel status is rejected by the body schema → 422', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight({ status: 'SCHEDULED' });
    const res = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/status`, headers, payload: { status: 'CANCELLED' } });
    expect(res.statusCode).toBe(422);
  });

  it('COMPLETED cascades CONFIRMED bookings to COMPLETED', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight({ status: 'DEPARTED' });
    const { client } = await makeClientRow();
    const confirmed = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED' });
    const stayNew = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'NEW' });

    await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/status`, headers, payload: { status: 'COMPLETED' } });

    expect((await prisma.booking.findUnique({ where: { id: confirmed.id } }))?.status).toBe('COMPLETED');
    expect((await prisma.booking.findUnique({ where: { id: stayNew.id } }))?.status).toBe('NEW'); // untouched
  });

  it('cannot change another driver’s flight → 404', async () => {
    const app = await getApp();
    const { headers } = await driverWithFlight();
    const other = await driverWithFlight({ status: 'SCHEDULED' });
    const res = await app.inject({ method: 'PATCH', url: `/driver-flights/${other.flight.id}/status`, headers, payload: { status: 'DEPARTED' } });
    expect(res.statusCode).toBe(404);
  });
});

describe('DriverFlightView passengers', () => {
  it('shows active passengers with contact, hides cancelled', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight();
    const { client } = await makeClientRow({ name: 'Пассажир', phone: '+996700123456' });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED' });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CANCELLED' });

    const res = await app.inject({ method: 'GET', url: `/driver-flights/${flight.id}`, headers });
    const passengers = res.json().passengers;
    expect(passengers).toHaveLength(1); // cancelled hidden
    expect(passengers[0].name).toBe('Пассажир');
    expect(passengers[0].phone).toBe('+996700123456'); // driver sees the passenger's contact
    expect(passengers[0]).toHaveProperty('paymentStatus');
  });
});

describe('PATCH /driver-flights/:id/payment-status', () => {
  it('PARTIAL is rejected → 400 (delegates to the flight endpoint rule)', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight();
    const res = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/payment-status`, headers, payload: { status: 'PARTIAL' } });
    expect(res.statusCode).toBe(400);
  });

  it('PAID marks the flight paid', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight();
    const res = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/payment-status`, headers, payload: { status: 'PAID' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().paymentStatus).toBe('PAID');
  });
});

describe('PATCH /driver-flights/:id/bookings/:bookingId/payment-status', () => {
  it('marks one passenger PAID', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight();
    const { client } = await makeClientRow();
    const b = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED' });
    const res = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/bookings/${b.id}/payment-status`, headers, payload: { status: 'PAID' } });
    expect(res.statusCode).toBe(200);
    expect((await prisma.booking.findUnique({ where: { id: b.id } }))?.paymentStatus).toBe('PAID');
  });

  it('a booking from another flight → 404', async () => {
    const app = await getApp();
    const { headers, flight } = await driverWithFlight();
    const otherFlight = await makeFlight();
    const { client } = await makeClientRow();
    const b = await makeBookingRow({ clientId: client.id, flightId: otherFlight.id, status: 'CONFIRMED' });
    const res = await app.inject({ method: 'PATCH', url: `/driver-flights/${flight.id}/bookings/${b.id}/payment-status`, headers, payload: { status: 'PAID' } });
    expect(res.statusCode).toBe(404);
  });
});
