import type { FastifyPluginAsync } from 'fastify';
import { DriverSetFlightStatusInput, Id } from '@easygo/shared';
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
};

export default routes;
