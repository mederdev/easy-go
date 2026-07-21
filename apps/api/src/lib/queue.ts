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

/** Telegram notifications to admins (new bookings / custom requests). */
export const notificationsQueue = new Queue('notifications', { connection: makeRedis() });

const notifyOpts = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 100,
} as const;

export async function enqueueBookingNotification(bookingId: string): Promise<void> {
  // jobId dedupes retried enqueues for the same booking (BullMQ forbids ":").
  await notificationsQueue.add('booking-created', { bookingId }, { ...notifyOpts, jobId: `booking-${bookingId}` });
}

export async function enqueueCustomRequestNotification(id: string): Promise<void> {
  await notificationsQueue.add('custom-request-created', { id }, { ...notifyOpts, jobId: `custom-request-${id}` });
}

export async function enqueueDriverApplicationNotification(id: string): Promise<void> {
  await notificationsQueue.add('driver-application-created', { id }, { ...notifyOpts, jobId: `driver-application-${id}` });
}

export async function enqueuePartnerApplicationNotification(id: string): Promise<void> {
  await notificationsQueue.add('partner-application-created', { id }, { ...notifyOpts, jobId: `partner-application-${id}` });
}
