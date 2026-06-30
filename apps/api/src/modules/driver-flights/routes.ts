import type { FastifyPluginAsync } from 'fastify';
import {
  DriverSetBookingPaymentInput,
  DriverSetFlightPaymentInput,
  DriverSetFlightStatusInput,
  Id,
} from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticateDriver);

  app.get('/', async (request) => {
    return svc.listDriverFlights(request.driverId!);
  });

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return svc.getDriverFlight(request.driverId!, parse(Id, id));
  });

  app.patch('/:id/status', async (request) => {
    const { id } = request.params as { id: string };
    const { status } = parse(DriverSetFlightStatusInput, request.body);
    return svc.setDriverFlightStatus(request.driverId!, parse(Id, id), status);
  });

  // Mark the whole flight paid/unpaid.
  app.patch('/:id/payment-status', async (request) => {
    const { id } = request.params as { id: string };
    const { status } = parse(DriverSetFlightPaymentInput, request.body);
    return svc.setDriverFlightPayment(request.driverId!, parse(Id, id), status);
  });

  // Mark a single booking on the flight paid/unpaid.
  app.patch('/:id/bookings/:bookingId/payment-status', async (request) => {
    const { id, bookingId } = request.params as { id: string; bookingId: string };
    const { status } = parse(DriverSetBookingPaymentInput, request.body);
    return svc.setDriverBookingPayment(request.driverId!, parse(Id, id), parse(Id, bookingId), status);
  });
};

export default routes;
