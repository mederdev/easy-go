import type { FastifyPluginAsync } from 'fastify';
import { UpdateSystemConfigInput } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import { getConfig, updateConfig } from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  // Public: client app needs currency, company name, WhatsApp phone.
  app.get('/', async () => getConfig());

  app.patch('/', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const input = parse(UpdateSystemConfigInput, request.body);
    return updateConfig(input);
  });
};

export default routes;
