import type { FastifyPluginAsync } from 'fastify';
import { ApplicationStatus, CreateCustomRequestInput, ListCustomRequestsQuery } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { parse } from '../../lib/validate.js';
import { enqueueCustomRequestNotification } from '../../lib/queue.js';

const routes: FastifyPluginAsync = async (app) => {
  // Public: client leaves a request when no suitable flight is found
  app.post('/', { config: { idempotent: true } }, async (request, reply) => {
    const input = parse(CreateCustomRequestInput, request.body);
    reply.code(201);
    const created = await prisma.customRequest.create({
      data: { ...input, phone: normalizePhone(input.phone) },
    });
    await enqueueCustomRequestNotification(created.id).catch(() => undefined);
    return created;
  });

  // Admin: list custom requests
  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListCustomRequestsQuery, request.query);
    const where = q.status ? { status: q.status } : undefined;
    const [items, total] = await Promise.all([
      prisma.customRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: q.limit, skip: q.offset }),
      prisma.customRequest.count({ where }),
    ]);
    // Resolve registered client names by matching phone (Client.phone is unique).
    const phones = [...new Set(items.map((r) => r.phone))];
    const clients = phones.length
      ? await prisma.client.findMany({ where: { phone: { in: phones } }, select: { phone: true, name: true } })
      : [];
    const nameByPhone = new Map(clients.map((c) => [c.phone, c.name]));
    const enriched = items.map((r) => ({ ...r, clientName: nameByPhone.get(r.phone) ?? null }));
    return { items: enriched, total, limit: q.limit, offset: q.offset };
  });

  // Admin: update status
  app.patch('/:id/status', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const status = parse(ApplicationStatus, (request.body as { status: unknown }).status);
    const found = await prisma.customRequest.findUnique({ where: { id } });
    if (!found) throw Errors.notFound('Заявка');
    return prisma.customRequest.update({ where: { id }, data: { status } });
  });
};

export default routes;
