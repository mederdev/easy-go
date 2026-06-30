import { randomUUID } from 'node:crypto';
import type {
  AdminCreateBookingInput,
  BookingStatus,
  CreateBookingInput,
  ListBookingsQuery,
  PaymentStatus,
  UpdateBookingPaymentInput,
} from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { enqueueStatsRecompute } from '../../lib/queue.js';
import { derivePaymentStatus, recomputeFlightPayment } from '../../lib/payment.js';

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
  opts: { status?: BookingStatus; discount?: number; prepaid?: number; idempotencyKey?: string } = {},
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

    // Discount/prepayment are admin-only; the public flow leaves them at 0.
    const discount = Math.min(opts.discount ?? 0, flight.route.price * input.pax);
    const total = Math.max(0, flight.route.price * input.pax - discount);
    const prepaid = Math.min(opts.prepaid ?? 0, total);

    // Create, then stamp a human code derived from the autoincrement seq.
    const created = await tx.booking.create({
      data: {
        code: `tmp-${randomUUID()}`,
        clientId: client.id,
        flightId: flight.id,
        pax: input.pax,
        discount,
        prepaid,
        total,
        status: opts.status ?? 'NEW',
        paymentStatus: derivePaymentStatus(prepaid, total),
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

    // Keep the flight's aggregated payment status in sync.
    await recomputeFlightPayment(tx, flight.id);

    return { booking: withCode, isNewClient: !existingClient, departAt: flight.departAt };
  });

  await enqueueStatsRecompute(isoDay(booking.departAt)).catch(() => undefined);
  return booking.booking;
}

export async function adminCreateBooking(input: AdminCreateBookingInput, idempotencyKey?: string) {
  return createBooking(input, {
    status: input.status,
    discount: input.discount,
    prepaid: input.prepaid,
    idempotencyKey,
  });
}

export async function listBookings(q: ListBookingsQuery) {
  const where = {
    status: q.status,
    clientId: q.clientId,
    flightId: q.flightId,
    ...(q.from || q.to
      ? {
          flight: {
            departAt: {
              gte: q.from ? new Date(`${q.from}T00:00:00.000Z`) : undefined,
              lte: q.to ? new Date(`${q.to}T23:59:59.999Z`) : undefined,
            },
          },
        }
      : {}),
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

    const updated = await tx.booking.update({ where: { id }, data: { status }, include: bookingInclude });
    // Cancelling/uncancelling changes which bookings count toward the flight total.
    await recomputeFlightPayment(tx, booking.flightId);
    return updated;
  });
}

/**
 * Admin-only edit of the money fields. Recomputes `total` from the flight price
 * and the new discount, clamps prepaid, re-derives the booking payment status,
 * keeps the denormalized client total in sync, and re-aggregates the flight.
 */
export async function updateBookingPayment(id: string, input: UpdateBookingPaymentInput) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: { flight: { include: { route: true } } },
    });
    if (!booking) throw Errors.notFound('Бронирование');

    const gross = booking.flight.route.price * booking.pax;
    const discount = Math.min(Math.max(0, input.discount ?? booking.discount), gross);
    const total = Math.max(0, gross - discount);
    const prepaid = Math.min(Math.max(0, input.prepaid ?? booking.prepaid), total);
    const paymentStatus = derivePaymentStatus(prepaid, total);

    const updated = await tx.booking.update({
      where: { id },
      data: { discount, prepaid, total, paymentStatus },
      include: bookingInclude,
    });

    // Active bookings contribute to the client's denormalized lifetime total.
    const isActive = booking.status !== 'CANCELLED'
      && booking.status !== 'CANCELLED_BY_CLIENT'
      && booking.status !== 'CANCELLED_BY_COMPANY';
    const delta = total - booking.total;
    if (isActive && delta !== 0) {
      await tx.client.update({
        where: { id: booking.clientId },
        data: { totalSum: { increment: delta } },
      });
    }

    await recomputeFlightPayment(tx, booking.flightId);
    return { booking: updated, departAt: booking.flight.departAt };
  });

  await enqueueStatsRecompute(isoDay(result.departAt)).catch(() => undefined);
  return result.booking;
}

/**
 * Explicit payment-status action (shared by admin and driver). PAID marks the
 * booking fully settled without touching amounts; anything else re-derives from
 * the prepaid amount. Re-aggregates the parent flight afterwards.
 */
export async function setBookingPaymentStatus(id: string, status: PaymentStatus) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw Errors.notFound('Бронирование');

    const next = status === 'PAID' ? 'PAID' : derivePaymentStatus(booking.prepaid, booking.total);
    const updated = await tx.booking.update({
      where: { id },
      data: { paymentStatus: next },
      include: bookingInclude,
    });
    await recomputeFlightPayment(tx, booking.flightId);
    return updated;
  });
}
