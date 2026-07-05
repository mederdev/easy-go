import { describe, it, expect } from 'vitest';
import { getApp, idemKey } from './helpers/app.js';
import { makeUser, makeRoute, makeFlight, uniquePhone } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

describe('POST /bookings (public)', () => {
  it('creates a NEW booking that holds NO seat and no trip counters', async () => {
    const app = await getApp();
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id, seatsTotal: 11 });
    const phone = uniquePhone();

    const res = await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 3, name: 'Гость', phone } });
    expect(res.statusCode).toBe(201);
    const b = res.json();
    expect(b.status).toBe('NEW');
    expect(b.total).toBe(1_050_000); // 350000 * 3
    expect(b.paymentStatus).toBe('UNPAID');
    expect(b.code).toMatch(/^№\d+$/);

    // counters untouched (read from DB — response snapshots pre-update state)
    const f = await prisma.flight.findUnique({ where: { id: flight.id } });
    expect(f?.seatsTaken).toBe(0);
    const client = await prisma.client.findUnique({ where: { phone } });
    expect(client?.tripsCount).toBe(0);
    expect(client?.totalSum).toBe(0);
    expect(client?.lastBookingAt).not.toBeNull();
  });

  it('upserts the client by phone (second booking reuses the row)', async () => {
    const app = await getApp();
    const flight = await makeFlight();
    const phone = uniquePhone();
    await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 1, name: 'Первый', phone } });
    await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 1, name: 'Второй', phone } });
    const clients = await prisma.client.findMany({ where: { phone } });
    expect(clients).toHaveLength(1);
    expect(clients[0].name).toBe('Второй'); // name updated on upsert
  });

  it('booking a non-SCHEDULED flight → 409 FLIGHT_CLOSED', async () => {
    const app = await getApp();
    const flight = await makeFlight({ status: 'CLOSED' });
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 1, name: 'X', phone: uniquePhone() } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('FLIGHT_CLOSED');
  });

  it('unknown flight → 404', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: '00000000-0000-0000-0000-000000000000', pax: 1, name: 'X', phone: uniquePhone() } });
    expect(res.statusCode).toBe(404);
  });

  it('pax out of range → 422', async () => {
    const app = await getApp();
    const flight = await makeFlight();
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 0, name: 'X', phone: uniquePhone() } });
    expect(res.statusCode).toBe(422);
  });
});

describe('POST /bookings idempotency', () => {
  it('same key + same body → replays, creating only ONE booking', async () => {
    const app = await getApp();
    const flight = await makeFlight();
    const phone = uniquePhone();
    const payload = { flightId: flight.id, pax: 2, name: 'Идемп', phone };
    const key = 'idem-key-同一';

    const first = await app.inject({ method: 'POST', url: '/bookings', payload, headers: idemKey(key) });
    const second = await app.inject({ method: 'POST', url: '/bookings', payload, headers: idemKey(key) });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.headers['idempotent-replay']).toBe('true');
    expect(second.json().id).toBe(first.json().id);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('same key + different body → 409 IDEMPOTENCY_MISMATCH', async () => {
    const app = await getApp();
    const flight = await makeFlight();
    const key = 'idem-key-clash';
    await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 1, name: 'A', phone: uniquePhone() }, headers: idemKey(key) });
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 2, name: 'B', phone: uniquePhone() }, headers: idemKey(key) });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('IDEMPOTENCY_MISMATCH');
  });
});

describe('POST /bookings/admin', () => {
  it('requires a back-office token', async () => {
    const app = await getApp();
    const flight = await makeFlight();
    const res = await app.inject({ method: 'POST', url: '/bookings/admin', payload: { flightId: flight.id, pax: 1, name: 'X', phone: uniquePhone(), status: 'CONFIRMED' } });
    expect(res.statusCode).toBe(401);
  });

  it('a CONFIRMED admin booking holds a seat and bumps client counters', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id, seatsTotal: 11 });
    const phone = uniquePhone();

    const res = await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload: { flightId: flight.id, pax: 3, name: 'VIP', phone, status: 'CONFIRMED' } });
    expect(res.statusCode).toBe(201);

    const f = await prisma.flight.findUnique({ where: { id: flight.id } });
    expect(f?.seatsTaken).toBe(3);
    const client = await prisma.client.findUnique({ where: { phone } });
    expect(client?.tripsCount).toBe(1);
    expect(client?.totalSum).toBe(1_050_000);
  });

  it('computes money: discount + prepaid → total + PARTIAL', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id });
    const res = await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload: { flightId: flight.id, pax: 3, name: 'X', phone: uniquePhone(), status: 'CONFIRMED', discount: 50_000, prepaid: 200_000 } });
    const b = res.json();
    expect(b.discount).toBe(50_000);
    expect(b.total).toBe(1_000_000); // 1050000 - 50000
    expect(b.prepaid).toBe(200_000);
    expect(b.paymentStatus).toBe('PARTIAL');
  });

  it('discount is clamped to the gross and prepaid to the total', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const route = await makeRoute({ price: 100_000 });
    const flight = await makeFlight({ routeId: route.id });
    const res = await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload: { flightId: flight.id, pax: 1, name: 'X', phone: uniquePhone(), status: 'CONFIRMED', discount: 999_999, prepaid: 999_999 } });
    const b = res.json();
    expect(b.discount).toBe(100_000); // clamped to gross
    expect(b.total).toBe(0);
    expect(b.prepaid).toBe(0); // clamped to total(0)
    expect(b.paymentStatus).toBe('UNPAID'); // fully-discounted booking is UNPAID
  });

  it('confirming beyond capacity → 409 NOT_ENOUGH_SEATS (no counter change)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const flight = await makeFlight({ seatsTotal: 4, seatsTaken: 0 });
    const res = await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload: { flightId: flight.id, pax: 5, name: 'X', phone: uniquePhone(), status: 'CONFIRMED' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('NOT_ENOUGH_SEATS');
    const f = await prisma.flight.findUnique({ where: { id: flight.id } });
    expect(f?.seatsTaken).toBe(0);
  });

  it('a NEW admin booking (default status) holds no seat', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const flight = await makeFlight({ seatsTotal: 11 });
    await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload: { flightId: flight.id, pax: 2, name: 'X', phone: uniquePhone() } });
    const f = await prisma.flight.findUnique({ where: { id: flight.id } });
    expect(f?.seatsTaken).toBe(0);
  });

  it('confirming to full auto-CLOSES the flight', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const flight = await makeFlight({ seatsTotal: 4, seatsTaken: 0 });
    await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload: { flightId: flight.id, pax: 4, name: 'X', phone: uniquePhone(), status: 'CONFIRMED' } });
    const f = await prisma.flight.findUnique({ where: { id: flight.id } });
    expect(f?.seatsTaken).toBe(4);
    expect(f?.status).toBe('CLOSED');
  });
});

describe('GET /bookings (list)', () => {
  it('paginates and filters by status + search', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const flight = await makeFlight();
    await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 1, name: 'Абдыл', phone: uniquePhone() } });
    await app.inject({ method: 'POST', url: '/bookings', payload: { flightId: flight.id, pax: 1, name: 'Бекзат', phone: uniquePhone() } });

    const all = await app.inject({ method: 'GET', url: '/bookings', headers });
    expect(all.json().total).toBe(2);

    const search = await app.inject({ method: 'GET', url: '/bookings?search=Абдыл', headers });
    expect(search.json().total).toBe(1);
    expect(search.json().items[0].client.name).toBe('Абдыл');
  });

  it('GET /bookings/:id unknown → 404', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'GET', url: '/bookings/00000000-0000-0000-0000-000000000000', headers });
    expect(res.statusCode).toBe(404);
  });
});
