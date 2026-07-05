import { describe, it, expect } from 'vitest';
import { getApp, bearer, clientToken } from './helpers/app.js';
import { makeDriver, makeClientRow, makeCar } from './helpers/factories.js';

describe('POST /driver-auth/login', () => {
  it('logs in and returns the driver profile with cars', async () => {
    const app = await getApp();
    const { driver } = await makeDriver({ password: 'driverpass', experience: '7 лет' });
    await makeCar({ driverId: driver.id, model: 'KIA Carnival', seats: 7 });
    const res = await app.inject({ method: 'POST', url: '/driver-auth/login', payload: { phone: driver.phone, password: 'driverpass' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.token).toBeTypeOf('string');
    expect(body.driver).toMatchObject({ id: driver.id, name: driver.name, experience: '7 лет' });
    expect(body.driver.cars).toHaveLength(1);
    expect(body.driver.cars[0]).toMatchObject({ model: 'KIA Carnival', seats: 7 });
    // no secret leakage
    expect(body.driver.passwordHash).toBeUndefined();
  });

  it('wrong password → 401', async () => {
    const app = await getApp();
    const { driver } = await makeDriver({ password: 'driverpass' });
    const res = await app.inject({ method: 'POST', url: '/driver-auth/login', payload: { phone: driver.phone, password: 'nope12345' } });
    expect(res.statusCode).toBe(401);
  });

  it('driver with no password set → 401', async () => {
    const app = await getApp();
    const { driver } = await makeDriver(); // no password
    const res = await app.inject({ method: 'POST', url: '/driver-auth/login', payload: { phone: driver.phone, password: 'anything1' } });
    expect(res.statusCode).toBe(401);
  });

  it('a deactivated driver is blocked at login → 403 (fixed desync #4)', async () => {
    const app = await getApp();
    const { driver } = await makeDriver({ password: 'driverpass', isActive: false });
    const res = await app.inject({ method: 'POST', url: '/driver-auth/login', payload: { phone: driver.phone, password: 'driverpass' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('FORBIDDEN');
  });
});

describe('GET /driver-auth/me', () => {
  it('returns the profile for a driver token', async () => {
    const app = await getApp();
    const { driver, headers } = await makeDriver({ withCar: true });
    const res = await app.inject({ method: 'GET', url: '/driver-auth/me', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: driver.id, name: driver.name });
  });

  it('no token → 401', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/driver-auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('client token (wrong kind) → 403', async () => {
    const app = await getApp();
    const { client } = await makeClientRow();
    const token = await clientToken(client.id);
    const res = await app.inject({ method: 'GET', url: '/driver-auth/me', headers: bearer(token) });
    expect(res.statusCode).toBe(403);
  });
});
