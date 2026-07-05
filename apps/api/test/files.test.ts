import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';
import { makeUser, makeCar } from './helpers/factories.js';

// Presigning is offline (SigV4 signature is computed locally, region is fixed),
// so these pass without a running MinIO.
describe('POST /files/presign (operator+)', () => {
  it('requires a token', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'POST', url: '/files/presign', payload: { ownerType: 'CAR', ownerId: '00000000-0000-0000-0000-000000000000', kind: 'CAR_PHOTO', contentType: 'image/jpeg', filename: 'a.jpg' } });
    expect(res.statusCode).toBe(401);
  });

  it('returns a presigned upload URL + fileId', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const car = await makeCar();
    const res = await app.inject({ method: 'POST', url: '/files/presign', headers, payload: { ownerType: 'CAR', ownerId: car.id, kind: 'CAR_PHOTO', contentType: 'image/jpeg', filename: 'photo.jpg' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.fileId).toBeTypeOf('string');
    expect(body.uploadUrl).toContain('http');
    expect(body.expiresIn).toBe(600);
    expect(body.key).toContain('car/');
  });
});

describe('GET /files (operator+)', () => {
  it('requires ownerType + ownerId → 400 when missing', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'operator' });
    const res = await app.inject({ method: 'GET', url: '/files', headers });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });

  it('lists files for an owner (with fresh presigned GET urls)', async () => {
    const app = await getApp();
    const { headers } = await makeUser({ role: 'admin' });
    const car = await makeCar();
    await app.inject({ method: 'POST', url: '/files/presign', headers, payload: { ownerType: 'CAR', ownerId: car.id, kind: 'CAR_PHOTO', contentType: 'image/jpeg', filename: 'photo.jpg' } });
    const res = await app.inject({ method: 'GET', url: `/files?ownerType=CAR&ownerId=${car.id}`, headers });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].url).toContain('http');
  });
});
