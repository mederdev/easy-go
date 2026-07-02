import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { CreateClientInput, ListClientsQuery, SetClientPasswordInput, UpdateClientInput, Id } from '@easygo/shared';
import { parse } from '../../lib/validate.js';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import * as svc from './service.js';

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authorize(['operator', 'admin', 'owner']));

  app.get('/', async (request) => svc.listClients(parse(ListClientsQuery, request.query)));

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return svc.getClient(parse(Id, id));
  });

  app.post('/', async (request, reply) => {
    reply.code(201);
    return svc.createClient(parse(CreateClientInput, request.body));
  });

  app.patch('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return svc.updateClient(parse(Id, id), parse(UpdateClientInput, request.body));
  });

  // Сброс пароля клиента админом («Забыли пароль» без привязанного Telegram).
  // Admin-issued passwords keep a plaintext copy for the reveal UI (as drivers do).
  app.post('/:id/set-password', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { password } = parse(SetClientPasswordInput, request.body);
    const clientId = parse(Id, id);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw Errors.notFound('Клиент');
    await prisma.client.update({
      where: { id: clientId },
      data: { passwordHash: await bcrypt.hash(password, 10), passwordRaw: password },
    });
    reply.code(204);
    return null;
  });

  // Удаление клиента (только без броней — история заказов неприкосновенна).
  app.delete('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const clientId = parse(Id, id);
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { _count: { select: { bookings: true } } },
    });
    if (!client) throw Errors.notFound('Клиент');
    if (client._count.bookings > 0) {
      throw Errors.conflict('У клиента есть брони — удаление невозможно', 'CLIENT_HAS_BOOKINGS');
    }
    try {
      await prisma.client.delete({ where: { id: clientId } });
    } catch (err) {
      // FK restrict race: a booking was created between the check and the delete.
      if ((err as { code?: string }).code === 'P2003') {
        throw Errors.conflict('У клиента есть брони — удаление невозможно', 'CLIENT_HAS_BOOKINGS');
      }
      throw err;
    }
    reply.code(204);
    return null;
  });
};

export default routes;
