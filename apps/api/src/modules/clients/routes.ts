import type { FastifyPluginAsync } from 'fastify';
import { CreateClientInput, ListClientsQuery, UpdateClientInput, Id } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authorize(['operator', 'admin', 'owner']));

  app.get('/', async (request) => svc.listClients(parse(ListClientsQuery, request.query)));

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return svc.getClient(parse(Id, id));
  });

  app.post('/', async (request, reply) => {
    reply.code(201);
    return svc.createClient(parse(CreateClientInput, request.body));
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return svc.updateClient(parse(Id, id), parse(UpdateClientInput, request.body));
  });
};

export default routes;
