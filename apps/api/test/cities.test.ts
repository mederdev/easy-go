import { describe, it, expect } from 'vitest';
import { getApp } from './helpers/app.js';

describe('GET /cities/search (public)', () => {
  it('matches a substring (case-insensitive)', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/cities/search?q=би' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toContain('Бишкек');
  });

  it('a query shorter than 2 chars → empty list', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/cities/search?q=Б' });
    expect(res.json()).toEqual([]);
  });

  it('no matches → empty list', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/cities/search?q=zzzzz' });
    expect(res.json()).toEqual([]);
  });

  it('caps results at 10', async () => {
    const app = await getApp();
    const res = await app.inject({ method: 'GET', url: '/cities/search?q=а' });
    expect(res.json().length).toBeLessThanOrEqual(10);
  });
});
