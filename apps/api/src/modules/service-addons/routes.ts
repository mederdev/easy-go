import type { FastifyPluginAsync } from 'fastify';
import { CreateServiceAddonInput, UpdateServiceAddonInput, Id } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  // Catalog of paid extra services. Any operator can read the pick-list; only
  // admins/owners manage the catalog itself.
  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async () =>
    svc.listServiceAddons(),
  );

  app.post('/', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const input = parse(CreateServiceAddonInput, request.body);
    reply.code(201);
    return svc.createServiceAddon(input);
  });

  app.patch('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    return svc.updateServiceAddon(parse(Id, id), parse(UpdateServiceAddonInput, request.body));
  });

  app.delete('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    return svc.deleteServiceAddon(parse(Id, id));
  });
};

export default routes;
