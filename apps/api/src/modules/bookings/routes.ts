import type { FastifyPluginAsync } from 'fastify';
import {
  AdminCreateBookingInput,
  CreateBookingInput,
  ListBookingsQuery,
  SetPaymentStatusInput,
  UpdateBookingPaymentInput,
  UpdateBookingStatusInput,
  Id,
  IDEMPOTENCY_HEADER,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  // Public booking submission from the client app (idempotent).
  app.post('/', { config: { idempotent: true } }, async (request, reply) => {
    const input = parse(CreateBookingInput, request.body);
    const key = request.headers[IDEMPOTENCY_HEADER];
    reply.code(201);
    return svc.createBooking(input, { idempotencyKey: typeof key === 'string' ? key : undefined });
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

  // Admin-only edit of discount/prepayment amounts.
  app.patch(
    '/:id/payment',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request) => {
      const { id } = request.params as { id: string };
      const input = parse(UpdateBookingPaymentInput, request.body);
      return svc.updateBookingPayment(parse(Id, id), input);
    },
  );

  // Mark paid / clear payment (admin side; the driver app uses /driver-flights).
  app.patch(
    '/:id/payment-status',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status } = parse(SetPaymentStatusInput, request.body);
      return svc.setBookingPaymentStatus(parse(Id, id), status);
    },
  );
};

export default routes;
