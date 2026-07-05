import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeDriver, makeCar, makeFlight, uniquePhone } from './helpers/factories.js';
import { prisma } from './helpers/db.js';

describe('GET /drivers', () => {
  it('operator can list drivers with their cars', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    await makeDriver({ withCar: true });
    const res = await app.inject({ method: 'GET', url: '/drivers', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].cars).toBeDefined();
  });
});

describe('POST /drivers (admin/owner)', () => {
  it('operator is forbidden → 403', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'POST', url: '/drivers', headers, payload: { name: 'Водитель', phone: uniquePhone() } });
    expect(res.statusCode).toBe(403);
  });

  it('admin creates a driver → 201', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const res = await app.inject({ method: 'POST', url: '/drivers', headers, payload: { name: 'Водитель', phone: uniquePhone(), experience: '3 года' } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ name: 'Водитель', experience: '3 года', isActive: true });
  });

  it('duplicate phone → 409 DRIVER_PHONE_TAKEN', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'owner' });
    const phone = uniquePhone();
    await makeDriver({ phone });
    const res = await app.inject({ method: 'POST', url: '/drivers', headers, payload: { name: 'Дубль', phone } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DRIVER_PHONE_TAKEN');
  });
});

describe('PATCH /drivers/:id — deactivation guard', () => {
  it('deactivating a driver with an ACTIVE flight → 409 DRIVER_HAS_ACTIVE_FLIGHTS', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { driver } = await makeDriver();
    const car = await makeCar({ driverId: driver.id });
    await makeFlight({ carId: car.id, status: 'SCHEDULED' });
    const res = await app.inject({ method: 'PATCH', url: `/drivers/${driver.id}`, headers, payload: { isActive: false } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DRIVER_HAS_ACTIVE_FLIGHTS');
  });

  it('a driver whose flights are all COMPLETED CAN be deactivated', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { driver } = await makeDriver();
    const car = await makeCar({ driverId: driver.id });
    await makeFlight({ carId: car.id, status: 'COMPLETED' });
    const res = await app.inject({ method: 'PATCH', url: `/drivers/${driver.id}`, headers, payload: { isActive: false } });
    expect(res.statusCode).toBe(200);
    expect(res.json().isActive).toBe(false);
  });
});

describe('POST /drivers/:id/set-password + DELETE guard', () => {
  it('admin sets password + plaintext copy → 204', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { driver } = await makeDriver();
    const res = await app.inject({ method: 'POST', url: `/drivers/${driver.id}/set-password`, headers, payload: { password: 'drvpass1' } });
    expect(res.statusCode).toBe(204);
    expect((await prisma.driver.findUnique({ where: { id: driver.id } }))?.passwordRaw).toBe('drvpass1');
  });

  it('a driver with ANY flight cannot be deleted → 409 DRIVER_HAS_FLIGHTS', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'owner' });
    const { driver } = await makeDriver();
    const car = await makeCar({ driverId: driver.id });
    await makeFlight({ carId: car.id, status: 'COMPLETED' }); // even a completed one blocks delete
    const res = await app.inject({ method: 'DELETE', url: `/drivers/${driver.id}`, headers });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('DRIVER_HAS_FLIGHTS');
  });

  it('a driver with no flights is deleted → 204 (car survives, driver unlinked)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const { driver } = await makeDriver();
    const car = await makeCar({ driverId: driver.id });
    const res = await app.inject({ method: 'DELETE', url: `/drivers/${driver.id}`, headers });
    expect(res.statusCode).toBe(204);
    expect(await prisma.driver.findUnique({ where: { id: driver.id } })).toBeNull();
    expect((await prisma.car.findUnique({ where: { id: car.id } }))?.driverId).toBeNull();
  });
});

describe('GET /drivers/:id/flights', () => {
  it('returns that driver’s flights', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const { driver } = await makeDriver();
    const car = await makeCar({ driverId: driver.id });
    await makeFlight({ carId: car.id });
    const res = await app.inject({ method: 'GET', url: `/drivers/${driver.id}/flights`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });
});
