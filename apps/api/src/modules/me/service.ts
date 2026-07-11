import type { MyBookingsQuery, UpdateMyProfileInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { setBookingStatus } from '../bookings/service.js';
import { toClientView } from '../client-auth/service.js';

const bookingInclude = {
  flight: { include: { route: true, car: { include: { driver: true } } } },
  stops: { orderBy: { order: 'asc' as const } },
  addons: { orderBy: { order: 'asc' as const } },
} as const;

export async function getProfile(clientId: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw Errors.notFound('Клиент');
  return toClientView(client);
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

/**
 * Load a custom request that belongs to the caller. Custom requests carry no
 * clientId — they're matched to a client by phone (Client.phone is unique), so a
 * phone-less (Telegram) client owns none. Not-owned/absent both surface as 404.
 */
async function myCustomRequest(clientId: string, id: string) {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { phone: true } });
  if (!client?.phone) throw Errors.notFound('Заявка');
  const req = await prisma.customRequest.findUnique({ where: { id } });
  if (!req || req.phone !== client.phone) throw Errors.notFound('Заявка');
  return req;
}

/**
 * Customer removes (withdraws) their own custom request. Cancelling and deleting
 * are one and the same for the client: a cancelled request is simply removed, so
 * this hard-deletes any of the caller's own requests regardless of status.
 */
export async function deleteMyCustomRequest(clientId: string, id: string) {
  await myCustomRequest(clientId, id); // ownership check (404 if not theirs)
  await prisma.customRequest.delete({ where: { id } });
  return { id };
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
  return toClientView(
    await prisma.client.update({
      where: { id: clientId },
      data: { name: input.name, whatsapp: input.whatsapp },
    }),
  );
}
