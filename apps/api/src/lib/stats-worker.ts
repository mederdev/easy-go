import { Worker } from 'bullmq';
import { makeRedis } from './queue.js';
import { recomputeDailyStats } from '../modules/analytics/service.js';

/**
 * In a modular monolith we run the stats worker in-process. Split into its own
 * container later by moving this to a dedicated `worker.ts` entrypoint.
 */
export function startStatsWorker(): Worker {
  return new Worker(
    'stats',
    async (job) => {
      if (job.name === 'recompute') {
        const { date } = job.data as { date: string };
        await recomputeDailyStats(date);
      }
    },
    { connection: makeRedis(), concurrency: 2 },
  );
}
