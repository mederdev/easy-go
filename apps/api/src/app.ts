import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { corsOrigins, isProd } from './env.js';
import { redis } from './lib/queue.js';

import authPlugin from './plugins/auth.js';
import idempotencyPlugin from './plugins/idempotency.js';
import errorHandler from './plugins/error-handler.js';

import authRoutes from './modules/auth/routes.js';
import clientAuthRoutes from './modules/client-auth/routes.js';
import driverAuthRoutes from './modules/driver-auth/routes.js';
import driverFlightRoutes from './modules/driver-flights/routes.js';
import meRoutes from './modules/me/routes.js';
import configRoutes from './modules/config/routes.js';
import routeRoutes from './modules/routes/routes.js';
import flightRoutes from './modules/flights/routes.js';
import bookingRoutes from './modules/bookings/routes.js';
import clientRoutes from './modules/clients/routes.js';
import driverRoutes from './modules/drivers/routes.js';
import fleetRoutes from './modules/fleet/routes.js';
import applicationRoutes from './modules/applications/routes.js';
import analyticsRoutes from './modules/analytics/routes.js';
import fileRoutes from './modules/files/routes.js';
import cityRoutes from './modules/cities/routes.js';
import customRequestRoutes from './modules/custom-requests/routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: isProd
      ? true
      : { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } },
    trustProxy: true,
  });

  // Cross-cutting
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: corsOrigins, credentials: true });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    redis,
    allowList: ['127.0.0.1'],
  });
  await app.register(errorHandler);
  await app.register(authPlugin);
  await app.register(idempotencyPlugin);

  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // Domain modules
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(clientAuthRoutes, { prefix: '/client-auth' });
  await app.register(driverAuthRoutes, { prefix: '/driver-auth' });
  await app.register(driverFlightRoutes, { prefix: '/driver-flights' });
  await app.register(meRoutes, { prefix: '/me' });
  await app.register(configRoutes, { prefix: '/config' });
  await app.register(routeRoutes, { prefix: '/routes' });
  await app.register(flightRoutes, { prefix: '/flights' });
  await app.register(bookingRoutes, { prefix: '/bookings' });
  await app.register(clientRoutes, { prefix: '/clients' });
  await app.register(driverRoutes, { prefix: '/drivers' });
  await app.register(fleetRoutes, { prefix: '/fleet' });
  await app.register(applicationRoutes, { prefix: '/applications' });
  await app.register(analyticsRoutes, { prefix: '/analytics' });
  await app.register(fileRoutes, { prefix: '/files' });
  await app.register(cityRoutes, { prefix: '/cities' });
  await app.register(customRequestRoutes, { prefix: '/custom-requests' });

  return app;
}
