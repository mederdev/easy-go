import type { FastifyPluginAsync } from 'fastify';
import { searchCities } from './data.js';

const routes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { q?: string } }>('/search', async (request) => {
    const q = String(request.query.q ?? '');
    return searchCities(q);
  });
};

export default routes;
