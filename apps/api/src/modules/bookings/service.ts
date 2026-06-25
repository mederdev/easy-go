import { randomUUID } from 'node:crypto';
import type {
  AdminCreateBookingInput,
  BookingStatus,
  CreateBookingInput,
  ListBookingsQuery,
} from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { enqueueStatsRecompute } from '../../lib/queue.js';

const bookingInclude = {
  client: true,
  flight: { include: { route: true, car: { include: { driver: true } } } },
} as const;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Create a booking. Upserts the client by phone, reserves seats atomically, and
 * keeps denormalized counters in sync. Safe to retry behind an Idempotency-Key.
 */
export async function createBooking(
  input: CreateBookingInput,
  opts: { status?: BookingStatus; idempotencyKey?: string } = {},
) {
  const phone = normalizePhone(input.phone);

  const booking = await prisma.$transaction(async (tx) => {
    const flight = await tx.flight.findUnique({ where: { id: input.flightId }, include: { route: true } });
    if (!flight) throw Errors.notFound('Рейс');
    if (flight.status !== 'SCHEDULED') throw Errors.conflict('Рейс закрыт для бронирования', 'FLIGHT_CLOSED');

    const seatsLeft = flight.seatsTotal - flight.seatsTaken;
    if (seatsLeft < input.pax) {
      throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
    }

    const existingClient = await tx.client.findUnique({ where: { phone } });
    const client = await tx.client.upsert({
      where: { phone },
      create: { name: input.name, phone, whatsapp: input.whatsapp },
      update: { name: input.name, whatsapp: input.whatsapp },
    });

    const total = flight.route.price * input.pax;

    // Create, then stamp a human code derived from the autoincrement seq.
    const created = await tx.booking.create({
      data: {
        code: `tmp-${randomUUID()}`,
        clientId: client.id,
        flightId: flight.id,
        pax: input.pax,
        total,
        status: opts.status ?? 'NEW',
        comment: input.comment ?? null,
        idempotencyKey: opts.idempotencyKey ?? null,
      },
    });
    const withCode = await tx.booking.update({
      where: { id: created.id },
      data: { code: `№${1000 + created.seq}` },
      include: bookingInclude,
    });

    // Reserve seats; close the flight when it fills up.
    const newTaken = flight.seatsTaken + input.pax;
    await tx.flight.update({
      where: { id: flight.id },
      data: {
        seatsTaken: newTaken,
        status: newTaken >= flight.seatsTotal ? 'CLOSED' : flight.status,
      },
    });

    // Denormalized client counters.
    await tx.client.update({
      where: { id: client.id },
      data: { tripsCount: { increment: 1 }, totalSum: { increment: total }, lastBookingAt: new Date() },
    });

    return { booking: withCode, isNewClient: !existingClient, departAt: flight.departAt };
  });

  await enqueueStatsRecompute(isoDay(booking.departAt)).catch(() => undefined);
  return booking.booking;
}

export async function adminCreateBooking(input: AdminCreateBookingInput, idempotencyKey?: string) {
  return createBooking(input, { status: input.status, idempotencyKey });
}

export async function listBookings(q: ListBookingsQuery) {
  const where = {
    status: q.status,
    clientId: q.clientId,
    flightId: q.flightId,
    ...(q.search
      ? {
          OR: [
            { code: { contains: q.search, mode: 'insensitive' as const } },
            { client: { name: { contains: q.search, mode: 'insensitive' as const } } },
            { client: { phone: { contains: q.search } } },
          ],
        }
      : {}),
  };

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

export async function getBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw Errors.notFound('Бронирование');
  return booking;
}

/** Explicit status transition. Cancelling frees the reserved seats. */
export async function setBookingStatus(id: string, status: BookingStatus) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw Errors.notFound('Бронирование');
    if (booking.status === status) return tx.booking.findUnique({ where: { id }, include: bookingInclude });

    const wasActive = booking.status !== 'CANCELLED';
    const willCancel = status === 'CANCELLED';

    if (wasActive && willCancel) {
      const flight = await tx.flight.findUnique({ where: { id: booking.flightId } });
      if (flight) {
        const newTaken = Math.max(0, flight.seatsTaken - booking.pax);
        await tx.flight.update({
          where: { id: flight.id },
          data: {
            seatsTaken: newTaken,
            status: flight.status === 'CLOSED' && newTaken < flight.seatsTotal ? 'SCHEDULED' : flight.status,
          },
        });
      }
      await tx.client.update({
        where: { id: booking.clientId },
        data: { tripsCount: { decrement: 1 }, totalSum: { decrement: booking.total } },
      });
    }

    return tx.booking.update({ where: { id }, data: { status }, include: bookingInclude });
  });
}
