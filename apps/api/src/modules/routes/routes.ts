import type { FastifyPluginAsync } from 'fastify';
import { CreateRouteInput, ListRoutesQuery, UpdateRouteInput, Id } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const adminOnly = (app: Parameters<FastifyPluginAsync>[0]) => ({
  preHandler: [app.authorize(['operator', 'admin', 'owner'])],
});

const routes: FastifyPluginAsync = async (app) => {
  // Public: active routes for the client app's "popular routes" + selectors.
  app.get('/public', async () => svc.listPublicRoutes());

  app.get('/', adminOnly(app), async (request) => {
    const q = parse(ListRoutesQuery, request.query);
    return svc.listRoutes(q);
  });

  app.get('/:id', adminOnly(app), async (request) => {
    const { id } = request.params as { id: string };
    return svc.getRoute(parse(Id, id));
  });

  app.post('/', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const input = parse(CreateRouteInput, request.body);
    reply.code(201);
    return svc.createRoute(input);
  });

  app.patch('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    return svc.updateRoute(parse(Id, id), parse(UpdateRouteInput, request.body));
  });

  app.delete('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    return svc.deleteRoute(parse(Id, id));
  });
};

export default routes;
