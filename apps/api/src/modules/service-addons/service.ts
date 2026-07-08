import type { CreateServiceAddonInput, UpdateServiceAddonInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';

/** Catalog of paid extra services shown in the admin pick-list (active only). */
export function listServiceAddons() {
  return prisma.serviceAddon.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getServiceAddon(id: string) {
  const addon = await prisma.serviceAddon.findUnique({ where: { id } });
  if (!addon || addon.status === 'ARCHIVED') throw Errors.notFound('Услуга');
  return addon;
}

export function createServiceAddon(input: CreateServiceAddonInput) {
  return prisma.serviceAddon.create({ data: input });
}

export async function updateServiceAddon(id: string, input: UpdateServiceAddonInput) {
  await getServiceAddon(id);
  return prisma.serviceAddon.update({ where: { id }, data: input });
}

/**
 * Soft-delete: archive instead of hard delete. Bookings that already attached
 * this service keep their snapshotted name/price; the row just leaves the
 * pick-list.
 */
export async function deleteServiceAddon(id: string) {
  await getServiceAddon(id);
  return prisma.serviceAddon.update({ where: { id }, data: { status: 'ARCHIVED' } });
}
