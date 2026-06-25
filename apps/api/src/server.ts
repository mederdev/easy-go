import { buildApp } from './app.js';
import { env } from './env.js';
import { ensureBucket } from './lib/minio.js';
import { prisma } from './lib/prisma.js';
import { startStatsWorker } from './lib/stats-worker.js';

async function main() {
  const app = await buildApp();

  // Best-effort: bucket may already be created by the compose `createbuckets` job.
  await ensureBucket().catch((err) => app.log.warn({ err }, 'MinIO bucket init skipped'));

  // Process the DailyStat recompute queue in-process (modular monolith).
  const worker = startStatsWorker();
  worker.on('failed', (job, err) => app.log.error({ err, jobId: job?.id }, 'stats job failed'));

  const close = async () => {
    app.log.info('Shutting down…');
    await worker.close();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
