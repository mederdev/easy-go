import { defineConfig } from 'vitest/config';

// Integration tests run the real Fastify app (via app.inject) against an
// ISOLATED Postgres database (easygo_test) and the local Redis — never the dev
// `easygo` DB. All files share one forked process (singleFork) so the app,
// Prisma and BullMQ Redis connections are built once; each test starts from a
// truncated DB (see test/helpers/setup.ts).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: false,
    // One DB, one Redis — serialize everything to avoid cross-file races.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['test/helpers/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://easygo:easygo@localhost:55432/easygo_test?schema=public',
      REDIS_URL: 'redis://localhost:56379',
      JWT_SECRET: 'test-jwt-secret-0123456789',
      JWT_EXPIRES_IN: '7d',
      // Present so telegram deep-links render; no bot token → sends are mocked.
      TELEGRAM_BOT_USERNAME: 'easygo_test_bot',
    },
    testTimeout: 20000,
    hookTimeout: 30000,
    teardownTimeout: 15000,
  },
});
