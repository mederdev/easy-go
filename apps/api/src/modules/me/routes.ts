import type { FastifyPluginAsync } from 'fastify';
import { MyBookingsQuery, SetClientPasswordInput, StopInput, UpdateMyProfileInput, UpdateStopInput, Id } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';
import { setClientPassword, toClientView } from '../client-auth/service.js';
import { addBookingStop, deleteBookingStop, updateBookingStop } from '../bookings/service.js';

/** Customer self-service, scoped to the authenticated client (kind=client JWT). */
const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticateClient);

  app.get('/', async (request) => svc.getProfile(request.clientId!));

  app.patch('/', async (request) =>
    svc.updateMyProfile(request.clientId!, parse(UpdateMyProfileInput, request.body)),
  );

  app.patch('/password', async (request) =>
    toClientView(await setClientPassword(request.clientId!, parse(SetClientPasswordInput, request.body))),
  );

  app.get('/bookings', async (request) =>
    svc.myBookings(request.clientId!, parse(MyBookingsQuery, request.query)),
  );

  app.get('/custom-requests', async (request) => svc.myCustomRequests(request.clientId!));

  app.get('/bookings/:id', async (request) => {
    const { id } = request.params as { id: string };
    return svc.myBooking(request.clientId!, parse(Id, id));
  });

  app.patch('/bookings/:id/cancel', async (request) => {
    const { id } = request.params as { id: string };
    return svc.cancelMyBooking(request.clientId!, parse(Id, id));
  });

  // ── Pickup/dropoff points on the client's own booking. Address/kind/note
  // only — every point's price is confirmed by an admin. ──
  app.post('/bookings/:id/stops', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = parse(StopInput, request.body);
    reply.code(201);
    return addBookingStop(parse(Id, id), input, { role: 'client', clientId: request.clientId! });
  });

  app.patch('/bookings/:id/stops/:stopId', async (request) => {
    const { id, stopId } = request.params as { id: string; stopId: string };
    // The client schema has no price field; a changed address resets the price server-side.
    const input = parse(UpdateStopInput.innerType().omit({ price: true }), request.body);
    return updateBookingStop(parse(Id, id), parse(Id, stopId), input, {
      role: 'client',
      clientId: request.clientId!,
    });
  });

  app.delete('/bookings/:id/stops/:stopId', async (request) => {
    const { id, stopId } = request.params as { id: string; stopId: string };
    return deleteBookingStop(parse(Id, id), parse(Id, stopId), {
      role: 'client',
      clientId: request.clientId!,
    });
  });
};

export default routes;
