import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeDriver, makeCar, uniquePlate } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

describe('GET /fleet/available (public)', () => {
  it('returns only AVAILABLE cars, no auth', async () => {
    const app = await getApp();
    await makeCar({ status: 'AVAILABLE', locationCity: 'Бишкек' });
    await makeCar({ status: 'MAINTENANCE' });
    const res = await app.inject({ method: 'GET', url: '/fleet/available' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].status).toBe('AVAILABLE');
  });
});

describe('GET /fleet (operator+)', () => {
  it('requires a token; filters by status', async () => {
    const app = await getApp();
    expect((await app.inject({ method: 'GET', url: '/fleet' })).statusCode).toBe(401);
    const { headers } = await makeUser({ role: 'operator' });
    await makeCar({ status: 'AVAILABLE' });
    await makeCar({ status: 'ON_TRIP' });
    const res = await app.inject({ method: 'GET', url: '/fleet?status=ON_TRIP', headers });
    expect(res.json()).toHaveLength(1);
  });

  it('GET /fleet/:id unknown → 404', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    expect((await app.inject({ method: 'GET', url: '/fleet/00000000-0000-0000-0000-000000000000', headers })).statusCode).toBe(404);
  });
});

describe('POST /fleet (admin/owner)', () => {
  it('operator is forbidden → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'POST', url: '/fleet', headers, payload: { model: 'KIA', plate: uniquePlate() } });
    expect(res.statusCode).toBe(403);
  });

  it('admin creates a car linked to a driver → 201', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { driver } = await makeDriver();
    const res = await app.inject({ method: 'POST', url: '/fleet', headers, payload: { model: 'KIA Carnival', plate: uniquePlate(), driverId: driver.id, seats: 7 } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ model: 'KIA Carnival', seats: 7 });
    expect(res.json().driver.id).toBe(driver.id);
  });

  it('duplicate plate → 409 CONFLICT', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const plate = uniquePlate();
    await makeCar({ plate });
    const res = await app.inject({ method: 'POST', url: '/fleet', headers, payload: { model: 'KIA', plate } });
    expect(res.statusCode).toBe(409);
  });

  it('creates a car with feature add-ons (their feature)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const res = await app.inject({ method: 'POST', url: '/fleet', headers, payload: { model: 'KIA', plate: uniquePlate(), features: ['ROOF_RACK', 'CHILD_SEAT'] } });
    expect(res.statusCode).toBe(201);
    expect(res.json().features).toEqual(expect.arrayContaining(['ROOF_RACK', 'CHILD_SEAT']));
  });
});

describe('PATCH /fleet/:id + /fleet/:id/location', () => {
  it('admin updates a car; operator cannot → 403', async () => {
    const app = await getApp();
    const car = await makeCar({ status: 'AVAILABLE' });
    const op = await makeUser({ role: 'operator' });
    expect((await app.inject({ method: 'PATCH', url: `/fleet/${car.id}`, headers: op.headers, payload: { status: 'MAINTENANCE' } })).statusCode).toBe(403);
    const admin = await makeUser({ role: 'admin' });
    const res = await app.inject({ method: 'PATCH', url: `/fleet/${car.id}`, headers: admin.headers, payload: { status: 'MAINTENANCE' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('MAINTENANCE');
  });

  it('operator CAN push a location update (dispatcher live ping)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const car = await makeCar();
    const res = await app.inject({ method: 'PATCH', url: `/fleet/${car.id}/location`, headers, payload: { lat: 42.87, lng: 74.6, locationCity: 'Бишкек' } });
    expect(res.statusCode).toBe(200);
    const row = await prisma.car.findUnique({ where: { id: car.id } });
    expect(row?.currentLat).toBeCloseTo(42.87);
    expect(row?.locationCity).toBe('Бишкек');
  });

  it('out-of-range coordinates → 422', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const car = await makeCar();
    const res = await app.inject({ method: 'PATCH', url: `/fleet/${car.id}/location`, headers, payload: { lat: 200, lng: 74.6 } });
    expect(res.statusCode).toBe(422);
  });
});
