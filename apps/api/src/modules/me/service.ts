import type { MyBookingsQuery, UpdateMyProfileInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { setBookingStatus } from '../bookings/service.js';

const bookingInclude = {
  flight: { include: { route: true, car: { include: { driver: true } } } },
} as const;

export async function getProfile(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw Errors.notFound('Клиент');
  return client;
}

export async function myBookings(clientId: string, q: MyBookingsQuery) {
  const where = { clientId, status: q.status };
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      skip: q.offset,
    }),
    prisma.booking.count({ where }),
  ]);
  return { items, total, limit: q.limit, offset: q.offset };
}

/** The client's own custom ("leave a request") entries, matched by phone. */
export async function myCustomRequests(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { phone: true } });
  if (!client) throw Errors.notFound('Клиент');
  // Telegram signups may not have a phone yet — nothing to match against.
  if (!client.phone) return { items: [], total: 0 };
  const items = await prisma.customRequest.findMany({
    where: { phone: client.phone },
    orderBy: { createdAt: 'desc' },
  });
  return { items, total: items.length };
}

export async function myBooking(clientId: string, id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking || booking.clientId !== clientId) throw Errors.notFound('Бронирование');
  return booking;
}

/** Customer self-cancel: only their own, not completed, before departure. */
export async function cancelMyBooking(clientId: string, id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: { flight: true } });
  if (!booking || booking.clientId !== clientId) throw Errors.notFound('Бронирование');
  if (booking.status === 'COMPLETED') {
    throw Errors.conflict('Завершённую поездку нельзя отменить', 'NOT_CANCELLABLE');
  }
  if (booking.status !== 'CANCELLED' && booking.flight && booking.flight.departAt.getTime() <= Date.now()) {
    throw Errors.conflict('Поездка уже началась — отмена недоступна', 'TOO_LATE');
  }
  // Reuses the shared transition (frees seats + fixes counters; no-op if already cancelled).
  return setBookingStatus(id, 'CANCELLED');
}

export async function updateMyProfile(clientId: string, input: UpdateMyProfileInput) {
  await getProfile(clientId);
  return prisma.client.update({
    where: { id: clientId },
    data: { name: input.name, whatsapp: input.whatsapp },
  });
}
