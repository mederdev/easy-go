import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeRoute, makeFlight, makeClientRow, makeBookingRow, makeCar, uniquePhone } from './helpers/factories.js';
import { recomputeDailyStats } from '../src/modules/analytics/service.js';

describe('GET /analytics/dashboard (live)', () => {
  it('requires a token', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/analytics/dashboard' })).statusCode).toBe(401);
  });

  it('counts today’s non-cancelled bookings, revenue, seats and available cars', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const today = new Date().toISOString().slice(0, 10);
    const departAt = new Date(`${today}T12:00:00.000Z`);
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id, departAt, status: 'SCHEDULED' });
    const { client } = await makeClientRow();
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED', pax: 3, total: 350_000 });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CANCELLED', pax: 2, total: 999 }); // excluded
    await makeCar({ status: 'AVAILABLE' });

    const res = await app.inject({ method: 'GET', url: '/analytics/dashboard', headers });
    expect(res.statusCode).toBe(200);
    const d = res.json();
    expect(d.ordersToday).toBe(1);
    expect(d.revenueToday).toBe(350_000);
    expect(d.seatsSoldToday).toBe(3);
    expect(d.availableCars).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /analytics/series (from DailyStat)', () => {
  it('returns recomputed per-day totals for a date range', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const day = '2026-09-15';
    const departAt = new Date(`${day}T10:00:00.000Z`);
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id, departAt });
    const { client } = await makeClientRow();
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED', total: 350_000 });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'COMPLETED', total: 200_000 });

    // The stats worker isn't running in tests — recompute directly.
    await recomputeDailyStats(day);

    const res = await app.inject({ method: 'GET', url: `/analytics/series?from=${day}&to=${day}`, headers });
    expect(res.statusCode).toBe(200);
    const s = res.json();
    expect(s.totalOrders).toBe(2);
    expect(s.totalRevenue).toBe(550_000);
    expect(s.points.length).toBeGreaterThanOrEqual(1);
  });

  it('excludes ALL cancelled variants from revenue, not just exact CANCELLED (fixed desync #2)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const day = '2026-09-16';
    const departAt = new Date(`${day}T10:00:00.000Z`);
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id, departAt });
    const { client } = await makeClientRow();
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CONFIRMED', total: 350_000 });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CANCELLED_BY_COMPANY', total: 999_000 });
    await makeBookingRow({ clientId: client.id, flightId: flight.id, status: 'CANCELLED_BY_CLIENT', total: 999_000 });
    await recomputeDailyStats(day);
    const res = await app.inject({ method: 'GET', url: `/analytics/series?from=${day}&to=${day}`, headers });
    expect(res.json().totalRevenue).toBe(350_000); // only the confirmed booking counts
    expect(res.json().totalOrders).toBe(1);
  });
});

describe('Cancellation reflects in analytics (fixed desync #2 + #5)', () => {
  it('cancelling a booking removes it from today’s live dashboard revenue', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const today = new Date().toISOString().slice(0, 10);
    const departAt = new Date(`${today}T12:00:00.000Z`);
    const route = await makeRoute({ price: 350_000 });
    const flight = await makeFlight({ routeId: route.id, departAt, status: 'SCHEDULED' });
    const booking = (await app.inject({ method: 'POST', url: '/bookings/admin', headers, payload: { flightId: flight.id, pax: 2, name: 'A', phone: uniquePhone(), status: 'CONFIRMED' } })).json();

    const before = await app.inject({ method: 'GET', url: '/analytics/dashboard', headers });
    expect(before.json().revenueToday).toBe(700_000);

    await app.inject({ method: 'PATCH', url: `/bookings/${booking.id}/status`, headers, payload: { status: 'CANCELLED_BY_COMPANY' } });

    const after = await app.inject({ method: 'GET', url: '/analytics/dashboard', headers });
    expect(after.json().revenueToday).toBe(0); // cancelled → excluded from revenue
    expect(after.json().ordersToday).toBe(0);
  });
});
