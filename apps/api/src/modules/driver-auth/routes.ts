import type { FastifyPluginAsync } from 'fastify';
import { DriverLoginInput, type DriverAuthResponse, type JwtClaims } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import { loginDriver, getDriverMe } from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request): Promise<DriverAuthResponse> => {
    const input = parse(DriverLoginInput, request.body);
    const driver = await loginDriver(input);
    const claims: JwtClaims = { kind: 'driver', sub: driver.id, name: driver.name };
    const token = app.jwt.sign(claims);
    return { token, driver };
  });

  app.get('/me', { preHandler: [app.authenticateDriver] }, async (request): Promise<DriverAuthResponse['driver']> => {
    return getDriverMe(request.driverId!);
  });
};

export default routes;
