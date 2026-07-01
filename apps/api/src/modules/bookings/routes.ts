import type { FastifyPluginAsync } from 'fastify';
import {
  AdminCreateBookingInput,
  CreateBookingInput,
  ListBookingsQuery,
  UpdateBookingStatusInput,
  Id,
  IDEMPOTENCY_HEADER,
  type JwtClaims,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  // Public booking submission from the client app (idempotent).
  app.post('/', { config: { idempotent: true } }, async (request, reply) => {
    const input = parse(CreateBookingInput, request.body);
    const key = request.headers[IDEMPOTENCY_HEADER];
    // Soft auth: attach the booking to the logged-in customer when a valid
    // client token is present (anonymous submissions still work).
    let clientId: string | undefined;
    if (request.headers.authorization) {
      try {
        const claims = (await request.jwtVerify()) as JwtClaims;
        if (claims.kind === 'client') clientId = claims.sub;
      } catch {
        // ignore — treat as an anonymous submission
      }
    }
    reply.code(201);
    return svc.createBooking(input, {
      idempotencyKey: typeof key === 'string' ? key : undefined,
      clientId,
    });
  });

  // ── Admin CRM ──
  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListBookingsQuery, request.query);
    return svc.listBookings(q);
  });

  app.get('/:id', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    return svc.getBooking(parse(Id, id));
  });

  app.post(
    '/admin',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])], config: { idempotent: true } },
    async (request, reply) => {
      const input = parse(AdminCreateBookingInput, request.body);
      const key = request.headers[IDEMPOTENCY_HEADER];
      reply.code(201);
      return svc.adminCreateBooking(input, typeof key === 'string' ? key : undefined);
    },
  );

  app.patch(
    '/:id/status',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status } = parse(UpdateBookingStatusInput, request.body);
      return svc.setBookingStatus(parse(Id, id), status);
    },
  );
};

export default routes;
