import type { FastifyPluginAsync } from 'fastify';
import {
  AvailableDatesQuery,
  CreateFlightInput,
  ListFlightsQuery,
  SearchFlightsQuery,
  SetPaymentStatusInput,
  UpdateFlightInput,
  Id,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  // Public search used by the client app's "Найти рейсы".
  app.get('/search', async (request) => {
    const q = parse(SearchFlightsQuery, request.query);
    return svc.searchFlights(q);
  });

  // Public: dates with available seats for a route window (for date-strip dots + calendar highlights).
  app.get('/available-dates', async (request) => {
    const q = parse(AvailableDatesQuery, request.query);
    return svc.getAvailableDates(q);
  });

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return svc.getFlight(parse(Id, id));
  });

  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListFlightsQuery, request.query);
    return svc.listFlights(q);
  });

  app.post('/', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const input = parse(CreateFlightInput, request.body);
    reply.code(201);
    return svc.createFlight(input);
  });

  app.patch('/:id', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    return svc.updateFlight(parse(Id, id), parse(UpdateFlightInput, request.body));
  });

  // Bulk-mark the whole flight paid/unpaid (cascades to its bookings).
  app.patch('/:id/payment-status', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = parse(SetPaymentStatusInput, request.body);
    return svc.setFlightPayment(parse(Id, id), status);
  });
};

export default routes;
