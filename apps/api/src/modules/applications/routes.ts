import type { FastifyPluginAsync } from 'fastify';
import {
  CreateDriverApplicationInput,
  CreatePartnerApplicationInput,
  UpdateApplicationStatusInput,
  ListApplicationsQuery,
  Id,
} from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { parse } from '../../lib/validate.js';
import {
  enqueueDriverApplicationNotification,
  enqueuePartnerApplicationNotification,
} from '../../lib/queue.js';

const routes: FastifyPluginAsync = async (app) => {
  // ── Public submissions (client app "Водителям" / "Партнёрам") ──
  app.post('/drivers', { config: { idempotent: true } }, async (request, reply) => {
    const input = parse(CreateDriverApplicationInput, request.body);
    reply.code(201);
    const created = await prisma.driverApplication.create({ data: { ...input, phone: normalizePhone(input.phone) } });
    await enqueueDriverApplicationNotification(created.id).catch(() => undefined);
    return created;
  });

  app.post('/partners', { config: { idempotent: true } }, async (request, reply) => {
    const input = parse(CreatePartnerApplicationInput, request.body);
    reply.code(201);
    const created = await prisma.partnerApplication.create({ data: input });
    await enqueuePartnerApplicationNotification(created.id).catch(() => undefined);
    return created;
  });

  // ── Admin review ──
  app.get('/drivers', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListApplicationsQuery, request.query);
    const [items, total] = await Promise.all([
      prisma.driverApplication.findMany({ where: { status: q.status }, orderBy: { createdAt: 'desc' }, take: q.limit, skip: q.offset }),
      prisma.driverApplication.count({ where: { status: q.status } }),
    ]);
    return { items, total, limit: q.limit, offset: q.offset };
  });

  app.get('/partners', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListApplicationsQuery, request.query);
    const [items, total] = await Promise.all([
      prisma.partnerApplication.findMany({ where: { status: q.status }, orderBy: { createdAt: 'desc' }, take: q.limit, skip: q.offset }),
      prisma.partnerApplication.count({ where: { status: q.status } }),
    ]);
    return { items, total, limit: q.limit, offset: q.offset };
  });

  app.patch('/drivers/:id/status', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = parse(UpdateApplicationStatusInput, request.body);
    const found = await prisma.driverApplication.findUnique({ where: { id: parse(Id, id) } });
    if (!found) throw Errors.notFound('Заявка');
    return prisma.driverApplication.update({ where: { id: found.id }, data: { status } });
  });

  app.patch('/partners/:id/status', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = parse(UpdateApplicationStatusInput, request.body);
    const found = await prisma.partnerApplication.findUnique({ where: { id: parse(Id, id) } });
    if (!found) throw Errors.notFound('Заявка');
    return prisma.partnerApplication.update({ where: { id: found.id }, data: { status } });
  });
};

export default routes;
