import type { CreateClientInput, ListClientsQuery, UpdateClientInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';

export async function listClients(q: ListClientsQuery) {
  const where = q.search
    ? {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' as const } },
          { phone: { contains: q.search } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.client.findMany({ where, orderBy: { lastBookingAt: 'desc' }, take: q.limit, skip: q.offset }),
    prisma.client.count({ where }),
  ]);
  return { items, total, limit: q.limit, offset: q.offset };
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      bookings: {
        include: { flight: { include: { route: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
  if (!client) throw Errors.notFound('Клиент');
  return client;
}

export function createClient(input: CreateClientInput) {
  return prisma.client.create({ data: { ...input, phone: normalizePhone(input.phone) } });
}

export async function updateClient(id: string, input: UpdateClientInput) {
  await getClient(id);
  return prisma.client.update({
    where: { id },
    data: { ...input, phone: input.phone ? normalizePhone(input.phone) : undefined },
  });
}
