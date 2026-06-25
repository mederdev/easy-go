import { Queue } from 'bullmq';
import IORedis, { type RedisOptions } from 'ioredis';
import { env } from '../env.js';

// BullMQ requires a separate connection per role: the Worker issues blocking
// commands that would otherwise monopolize a shared client. So every consumer
// gets its own connection from this factory — never share one instance.
const redisOptions: RedisOptions = { maxRetriesPerRequest: null };

export function makeRedis(): IORedis {
  return new IORedis(env.REDIS_URL, redisOptions);
}

/** Dedicated, non-blocking client for @fastify/rate-limit. */
export const redis = makeRedis();

/** Queue gets its own connection (distinct from the worker's). */
export const statsQueue = new Queue('stats', { connection: makeRedis() });

export async function enqueueStatsRecompute(date: string): Promise<void> {
  await statsQueue.add(
    'recompute',
    { date },
    { removeOnComplete: 100, removeOnFail: 100 },
  );
}
