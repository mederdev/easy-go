import type { FastifyPluginAsync } from 'fastify';
import { AnalyticsQuery } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authorize(['operator', 'admin', 'owner']));

  app.get('/dashboard', async () => svc.dashboardSummary());

  app.get('/series', async (request) => svc.analyticsSeries(parse(AnalyticsQuery, request.query)));
};

export default routes;
