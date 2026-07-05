import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeRoute, makeFlight, makeCar, makeDriver, makeClientRow, makeBookingRow } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

// A UTC calendar day in the future and a departure inside it.
function futureDay(offsetDays = 1) {
  const date = new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  return { date, departAt: new Date(`${date}T09:00:00.000Z`) };
}

describe('GET /flights/search (public)', () => {
  it('returns SCHEDULED flights on an ACTIVE matching route with enough seats', async () => {
    const app = await getApp();
    const { date, departAt } = futureDay();
    const route = await makeRoute({ fromCity: 'Бишкек', toCity: 'Алматы' });
    await makeFlight({ routeId: route.id, departAt, seatsTotal: 11, seatsTaken: 0 });

    const res = await app.inject({ method: 'GET', url: `/flights/search?fromCity=Бишкек&toCity=Алматы&date=${date}&pax=2` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].seatsLeft).toBe(11);
  });

  it('excludes a flight without enough seats for pax', async () => {
    const app = await getApp();
    const { date, departAt } = futureDay();
    const route = await makeRoute({ fromCity: 'Бишкек', toCity: 'Ош' });
    await makeFlight({ routeId: route.id, departAt, seatsTotal: 11, seatsTaken: 10 }); // 1 left
    const res = await app.inject({ method: 'GET', url: `/flights/search?fromCity=Бишкек&toCity=Ош&date=${date}&pax=2` });
    expect(res.json()).toHaveLength(0);
  });

  it('excludes CLOSED flights and flights on non-ACTIVE routes', async () => {
    const app = await getApp();
    const { date, departAt } = futureDay();
    const closedRoute = await makeRoute({ fromCity: 'Бишкек', toCity: 'Талас' });
    await makeFlight({ routeId: closedRoute.id, departAt, status: 'CLOSED' });
    const draftRoute = await makeRoute({ fromCity: 'Бишкек', toCity: 'Баткен', status: 'DRAFT' });
    await makeFlight({ routeId: draftRoute.id, departAt, status: 'SCHEDULED' });

    const r1 = await app.inject({ method: 'GET', url: `/flights/search?fromCity=Бишкек&toCity=Талас&date=${date}&pax=1` });
    expect(r1.json()).toHaveLength(0);
    const r2 = await app.inject({ method: 'GET', url: `/flights/search?fromCity=Бишкек&toCity=Баткен&date=${date}&pax=1` });
    expect(r2.json()).toHaveLength(0);
  });
});

describe('GET /flights/available-dates', () => {
  it('lists days that have a bookable seat', async () => {
    const app = await getApp();
    const { date, departAt } = futureDay(2);
    const route = await makeRoute({ fromCity: 'Бишкек', toCity: 'Чолпон-Ата' });
    await makeFlight({ routeId: route.id, departAt });
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
    const res = await app.inject({ method: 'GET', url: `/flights/available-dates?fromCity=Бишкек&toCity=Чолпон-Ата&from=${from}&to=${to}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toContain(date);
  });
});

describe('GET /flights/:id (public detail)', () => {
  it('derives seatsLeft / fewSeats / soldOut', async () => {
    const app = await getApp();
    const route = await makeRoute();
    const few = await makeFlight({ routeId: route.id, seatsTotal: 11, seatsTaken: 9 }); // 2 left → few
    const sold = await makeFlight({ routeId: route.id, seatsTotal: 11, seatsTaken: 11 }); // sold out

    const fewRes = await app.inject({ method: 'GET', url: `/flights/${few.id}` });
    expect(fewRes.json()).toMatchObject({ seatsLeft: 2, fewSeats: true, soldOut: false });

    const soldRes = await app.inject({ method: 'GET', url: `/flights/${sold.id}` });
    expect(soldRes.json()).toMatchObject({ seatsLeft: 0, soldOut: true });
  });

  it('unknown id → 404', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/flights/00000000-0000-0000-0000-000000000000' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /flights', () => {
  it('admin creates a flight (seatsTaken 0, UNPAID)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const route = await makeRoute();
    const driver = await makeDriver();
    const car = await makeCar({ driverId: driver.driver.id });
    const { departAt } = futureDay();
    const res = await app.inject({ method: 'POST', url: '/flights', headers, payload: { routeId: route.id, carId: car.id, departAt: departAt.toISOString(), seatsTotal: 7 } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ seatsTaken: 0, paymentStatus: 'UNPAID', seatsTotal: 7 });
  });

  it('operator cannot create a flight → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const route = await makeRoute();
    const { departAt } = futureDay();
    const res = await app.inject({ method: 'POST', url: '/flights', headers, payload: { routeId: route.id, departAt: departAt.toISOString() } });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /flights/:id', () => {
  it('operator can update a flight', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const flight = await makeFlight();
    const res = await app.inject({ method: 'PATCH', url: `/flights/${flight.id}`, headers, payload: { pickupAddress: 'ТЦ Дордой' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().pickupAddress).toBe('ТЦ Дордой');
  });
});

describe('PATCH /flights/:id/payment-status', () => {
  it('PARTIAL is rejected (auto-computed) → 400 BAD_REQUEST', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const flight = await makeFlight();
    const res = await app.inject({ method: 'PATCH', url: `/flights/${flight.id}/payment-status`, headers, payload: { status: 'PARTIAL' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });

  it('marking PAID forces the flight aggregate to PAID', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const flight = await makeFlight();
    const res = await app.inject({ method: 'PATCH', url: `/flights/${flight.id}/payment-status`, headers, payload: { status: 'PAID' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().paymentStatus).toBe('PAID');
  });

  it('marking PAID does NOT touch NEW requests, only holding bookings (fixed desync #6)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id });
    const { client } = await makeClientRow();
    const newB = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'NEW', total: 350_000 });
    const confB = await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED', total: 350_000 });

    await app.inject({ method: 'PATCH', url: `/flights/${flight.id}/payment-status`, headers, payload: { status: 'PAID' } });

    expect((await prisma.booking.findUnique({ where: { id: newB.id } }))?.paymentStatus).toBe('UNPAID'); // untouched
    expect((await prisma.booking.findUnique({ where: { id: confB.id } }))?.paymentStatus).toBe('PAID');
  });
});

describe('Bad references return 4xx, not 500 (fixed desync #7)', () => {
  it('creating a flight with a non-existent routeId → 400', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { departAt } = futureDay();
    const res = await app.inject({ method: 'POST', url: '/flights', headers, payload: { routeId: '00000000-0000-0000-0000-000000000000', departAt: departAt.toISOString() } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });
});

describe('Car availability — one flight per car per day (their feature)', () => {
  it('a second flight for the same car on the same day → 409', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const route = await makeRoute();
    const car = await makeCar();
    const { departAt } = futureDay();
    await makeFlight({ routeId: route.id, carId: car.id, departAt });
    const res = await app.inject({ method: 'POST', url: '/flights', headers, payload: { routeId: route.id, carId: car.id, departAt: departAt.toISOString() } });
    expect(res.statusCode).toBe(409);
  });

  it('the same car on a different day is allowed', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const route = await makeRoute();
    const car = await makeCar();
    await makeFlight({ routeId: route.id, carId: car.id, departAt: futureDay(1).departAt });
    const res = await app.inject({ method: 'POST', url: '/flights', headers, payload: { routeId: route.id, carId: car.id, departAt: futureDay(3).departAt.toISOString() } });
    expect(res.statusCode).toBe(201);
  });
});
