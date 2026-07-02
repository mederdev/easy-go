import type { FastifyPluginAsync } from 'fastify';
import { MyBookingsQuery, SetClientPasswordInput, UpdateMyProfileInput, Id } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';
import { setClientPassword, toClientView } from '../client-auth/service.js';

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
};

export default routes;
