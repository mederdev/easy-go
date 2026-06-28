import type { FastifyPluginAsync } from 'fastify';
import { CreateCustomRequestInput, ListCustomRequestsQuery } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { parse } from '../../lib/validate.js';

const routes: FastifyPluginAsync = async (app) => {
  // Public: client leaves a request when no suitable flight is found
  app.post('/', { config: { idempotent: true } }, async (request, reply) => {
    const input = parse(CreateCustomRequestInput, request.body);
    reply.code(201);
    return prisma.customRequest.create({
      data: { ...input, phone: normalizePhone(input.phone) },
    });
  });

  // Admin: list custom requests
  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListCustomRequestsQuery, request.query);
    const where = q.status ? { status: q.status } : undefined;
    const [items, total] = await Promise.all([
      prisma.customRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: q.limit, skip: q.offset }),
      prisma.customRequest.count({ where }),
    ]);
    return { items, total, limit: q.limit, offset: q.offset };
  });

  // Admin: update status
  app.patch('/:id/status', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const found = await prisma.customRequest.findUnique({ where: { id } });
    if (!found) throw Errors.notFound('Заявка');
    return prisma.customRequest.update({ where: { id }, data: { status } });
  });
};

export default routes;
