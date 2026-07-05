import { beforeEach } from 'vitest';
import { resetDb } from './db.js';

// Fail fast if a test accidentally points at the dev database.
if (!/easygo_test/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error(`Refusing to run tests: DATABASE_URL is not the test DB (${process.env.DATABASE_URL})`);
}

// Every test starts from an empty database.
beforeEach(async () => {
  await resetDb();
});
