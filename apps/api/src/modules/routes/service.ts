import type { CreateRouteInput, ListRoutesQuery, UpdateRouteInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';

export function listRoutes(q: ListRoutesQuery) {
  return prisma.route.findMany({
    where: {
      status: q.status,
      fromCity: q.fromCity,
      toCity: q.toCity,
    },
    orderBy: [{ status: 'asc' }, { fromCity: 'asc' }],
  });
}

/** Routes shown to the public client app (active only). */
export function listPublicRoutes() {
  return prisma.route.findMany({ where: { status: 'ACTIVE' }, orderBy: { price: 'asc' } });
}

export async function getRoute(id: string) {
  const route = await prisma.route.findUnique({ where: { id } });
  if (!route) throw Errors.notFound('Маршрут');
  return route;
}

export function createRoute(input: CreateRouteInput) {
  return prisma.route.create({ data: input });
}

export async function updateRoute(id: string, input: UpdateRouteInput) {
  await getRoute(id);
  return prisma.route.update({ where: { id }, data: input });
}

export async function deleteRoute(id: string) {
  await getRoute(id);
  // Soft-delete: archive instead of hard delete (flights may reference it).
  return prisma.route.update({ where: { id }, data: { status: 'ARCHIVED' } });
}
