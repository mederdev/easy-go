import type { FastifyPluginAsync } from 'fastify';
import {
  AddBookingAddonInput,
  AdminCreateBookingInput,
  AdminStopInput,
  CreateBookingInput,
  ListBookingsQuery,
  SetPaymentStatusInput,
  UpdateBookingAddonInput,
  UpdateBookingPaymentInput,
  UpdateBookingStatusInput,
  UpdateStopInput,
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

  // ── Pickup/dropoff points (admin manages addresses and confirms prices) ──
  app.post(
    '/:id/stops',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = parse(AdminStopInput, request.body);
      reply.code(201);
      return svc.addBookingStop(parse(Id, id), input, { role: 'admin' });
    },
  );

  app.patch(
    '/:id/stops/:stopId',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request) => {
      const { id, stopId } = request.params as { id: string; stopId: string };
      const input = parse(UpdateStopInput, request.body);
      return svc.updateBookingStop(parse(Id, id), parse(Id, stopId), input, { role: 'admin' });
    },
  );

  app.delete(
    '/:id/stops/:stopId',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request) => {
      const { id, stopId } = request.params as { id: string; stopId: string };
      return svc.deleteBookingStop(parse(Id, id), parse(Id, stopId), { role: 'admin' });
    },
  );

  // ── Extra services / доп. услуги (admin attaches catalog services, priced in) ──
  app.post(
    '/:id/addons',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = parse(AddBookingAddonInput, request.body);
      reply.code(201);
      return svc.addBookingAddon(parse(Id, id), input);
    },
  );

  app.patch(
    '/:id/addons/:addonId',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request) => {
      const { id, addonId } = request.params as { id: string; addonId: string };
      const input = parse(UpdateBookingAddonInput, request.body);
      return svc.updateBookingAddon(parse(Id, id), parse(Id, addonId), input);
    },
  );

  app.delete(
    '/:id/addons/:addonId',
    { preHandler: [app.authorize(['operator', 'admin', 'owner'])] },
    async (request) => {
      const { id, addonId } = request.params as { id: string; addonId: string };
      return svc.deleteBookingAddon(parse(Id, id), parse(Id, addonId));
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
