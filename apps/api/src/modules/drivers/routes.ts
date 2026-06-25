import type { FastifyPluginAsync } from 'fastify';
import { CreateDriverInput, UpdateDriverInput, Id } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { parse } from '../../lib/validate.js';

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authorize(['operator', 'admin', 'owner']));

  app.get('/', async () => prisma.driver.findMany({ include: { cars: true }, orderBy: { name: 'asc' } }));

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const driver = await prisma.driver.findUnique({ where: { id: parse(Id, id) }, include: { cars: true } });
    if (!driver) throw Errors.notFound('Водитель');
    return driver;
  });

  app.post('/', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const input = parse(CreateDriverInput, request.body);
    reply.code(201);
    return prisma.driver.create({ data: { ...input, phone: normalizePhone(input.phone) } });
  });

  app.patch('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(UpdateDriverInput, request.body);
    return prisma.driver.update({
      where: { id: parse(Id, id) },
      data: { ...input, phone: input.phone ? normalizePhone(input.phone) : undefined },
    });
  });
};

export default routes;
