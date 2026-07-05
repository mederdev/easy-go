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
import { enqueueBookingNotification, enqueueStatsRecompute } from '../../lib/queue.js';
import { derivePaymentStatus, recomputeFlightPayment } from '../../lib/payment.js';

const bookingInclude = {
  client: true,
  flight: { include: { route: true, car: { include: { driver: true } } } },
} as const;

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Booking statuses that hold a reserved seat on the flight — i.e. the booking is
 * "attached" to the flight. A booking only reserves a seat (and counts toward the
 * client's trip totals) once an admin confirms it; NEW requests and any cancelled
 * state hold nothing. Attaching/detaching happens on the status transitions that
 * cross this boundary (see `setBookingStatus`).
 */
const SEAT_HOLDING_STATUSES: BookingStatus[] = ['CONFIRMED', 'COMPLETED'];
function holdsSeat(status: BookingStatus): boolean {
  return SEAT_HOLDING_STATUSES.includes(status);
}

const CANCELLED_STATUSES: BookingStatus[] = ['CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY'];

/**
 * Allowed booking status transitions. Without this, `setBookingStatus` would let
 * illegal jumps (e.g. COMPLETED→NEW, or reviving a cancelled booking) silently
 * detach/attach seats and skew the client's trip counters. Cancelled states are
 * terminal; a completed trip can only be force-cancelled by the company.
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY'],
  COMPLETED: ['CANCELLED_BY_COMPANY'],
  CANCELLED: [],
  CANCELLED_BY_CLIENT: [],
  CANCELLED_BY_COMPANY: [],
};

/**
 * Create a booking. Upserts the client by phone, reserves seats atomically, and
 * keeps denormalized counters in sync. Safe to retry behind an Idempotency-Key.
 */
export async function createBooking(
  input: CreateBookingInput,
  opts: {
    status?: BookingStatus;
    discount?: number;
    prepaid?: number;
    idempotencyKey?: string;
    clientId?: string;
    /** Telegram admin notification (default true; admin-created bookings skip it). */
    notify?: boolean;
  } = {},
) {
  const phone = normalizePhone(input.phone);

  const booking = await prisma.$transaction(async (tx) => {
    const flight = await tx.flight.findUnique({ where: { id: input.flightId }, include: { route: true } });
    if (!flight) throw Errors.notFound('Рейс');
    if (flight.status !== 'SCHEDULED') throw Errors.conflict('Рейс закрыт для бронирования', 'FLIGHT_CLOSED');

    const status = opts.status ?? 'NEW';
    // Only a confirmed booking is "attached" (reserves seats). NEW requests don't
    // consume capacity, so several may await confirmation — seats are checked and
    // reserved when the admin confirms.
    const reservesSeat = holdsSeat(status);
    if (reservesSeat) {
      const seatsLeft = flight.seatsTotal - flight.seatsTaken;
      if (seatsLeft < input.pax) {
        throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
      }
    }

    // Authenticated customer (e.g. Telegram signup) → attach to their account and
    // back-fill the phone if they don't have one yet. Otherwise upsert by phone.
    let client;
    let isNewClient = false;
    if (opts.clientId) {
      const existing = await tx.client.findUnique({ where: { id: opts.clientId } });
      if (!existing) throw Errors.notFound('Клиент');
      client = await tx.client.update({
        where: { id: existing.id },
        data: { name: input.name, whatsapp: input.whatsapp, ...(existing.phone ? {} : { phone }) },
      });
    } else {
      const existingClient = await tx.client.findUnique({ where: { phone } });
      isNewClient = !existingClient;
      client = await tx.client.upsert({
        where: { phone },
        create: { name: input.name, phone, whatsapp: input.whatsapp },
        update: { name: input.name, whatsapp: input.whatsapp },
      });
    }

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
        status,
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

    // Reserve seats + bump lifetime trip counters only for an already-confirmed
    // booking; a NEW request stays unattached until an admin confirms it.
    if (reservesSeat) {
      const newTaken = flight.seatsTaken + input.pax;
      await tx.flight.update({
        where: { id: flight.id },
        data: {
          seatsTaken: newTaken,
          status: newTaken >= flight.seatsTotal ? 'CLOSED' : flight.status,
        },
      });
      await tx.client.update({
        where: { id: client.id },
        data: { tripsCount: { increment: 1 }, totalSum: { increment: total }, lastBookingAt: new Date() },
      });
    } else {
      await tx.client.update({ where: { id: client.id }, data: { lastBookingAt: new Date() } });
    }

    // Keep the flight's aggregated payment status in sync.
    await recomputeFlightPayment(tx, flight.id);

    return { booking: withCode, isNewClient, departAt: flight.departAt };
  });

  await enqueueStatsRecompute(isoDay(booking.departAt)).catch(() => undefined);
  if (opts.notify !== false) {
    await enqueueBookingNotification(booking.booking.id).catch(() => undefined);
  }
  return booking.booking;
}

export async function adminCreateBooking(input: AdminCreateBookingInput, idempotencyKey?: string) {
  return createBooking(input, {
    status: input.status,
    discount: input.discount,
    prepaid: input.prepaid,
    idempotencyKey,
    notify: false, // the operator entered it themselves — nothing to announce
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

/**
 * Explicit status transition. Confirming a booking attaches it to the flight
 * (reserves seats, bumps the client's trip counters); cancelling a confirmed
 * booking detaches it (frees seats, reopens a full flight). Transitions that
 * don't cross the "attached" boundary (e.g. NEW→CANCELLED, CONFIRMED→COMPLETED)
 * leave capacity untouched.
 */
export async function setBookingStatus(id: string, status: BookingStatus) {
  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw Errors.notFound('Бронирование');
    if (booking.status === status) return tx.booking.findUnique({ where: { id }, include: bookingInclude });

    if (!ALLOWED_TRANSITIONS[booking.status].includes(status)) {
      throw Errors.badRequest(`Нельзя перевести бронирование из статуса «${booking.status}» в «${status}»`);
    }

    const wasHolding = holdsSeat(booking.status);
    const willHold = holdsSeat(status);

    if (!wasHolding && willHold) {
      // Attaching: reserve seats now, re-checking availability at confirmation time.
      const flight = await tx.flight.findUnique({ where: { id: booking.flightId } });
      if (!flight) throw Errors.notFound('Рейс');
      const seatsLeft = flight.seatsTotal - flight.seatsTaken;
      if (seatsLeft < booking.pax) {
        throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
      }
      const newTaken = flight.seatsTaken + booking.pax;
      await tx.flight.update({
        where: { id: flight.id },
        data: {
          seatsTaken: newTaken,
          status: newTaken >= flight.seatsTotal ? 'CLOSED' : flight.status,
        },
      });
      await tx.client.update({
        where: { id: booking.clientId },
        data: { tripsCount: { increment: 1 }, totalSum: { increment: booking.total } },
      });
    } else if (wasHolding && !willHold) {
      // Detaching: free the reserved seats and reopen a flight that had filled up.
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
    // Attaching/detaching changes which bookings count toward the flight total.
    await recomputeFlightPayment(tx, booking.flightId);
    return updated;
  });
  // A status change (especially a cancellation) changes which bookings count
  // toward that day's DailyStat revenue/orders — recompute off-request (desync #5).
  if (updated?.flight) await enqueueStatsRecompute(isoDay(updated.flight.departAt)).catch(() => undefined);
  return updated;
}

/**
 * Cascade a completed flight to its passengers: every CONFIRMED booking becomes
 * COMPLETED. Both statuses hold a seat and count toward the flight total, so
 * capacity counters and the payment aggregate stay untouched. NEW (unconfirmed)
 * bookings are left alone — completing them would start holding seats.
 */
export async function completeFlightBookings(flightId: string): Promise<void> {
  await prisma.booking.updateMany({
    where: { flightId, status: 'CONFIRMED' },
    data: { status: 'COMPLETED' },
  });
}

/**
 * Cancel a whole flight's bookings (used when a flight itself is cancelled). Every
 * not-already-cancelled booking moves to `status`; seat-holding ones additionally
 * free their seats and roll back the client's trip counters, then the flight's
 * seatsTaken and aggregated payment status are recomputed. Without this, cancelling
 * a flight would leave stale seatsTaken / bookings / client totals (desync #1).
 */
export async function cancelFlightBookings(flightId: string, status: BookingStatus): Promise<void> {
  const departAt = await prisma.$transaction(async (tx) => {
    const flight = await tx.flight.findUnique({ where: { id: flightId } });
    if (!flight) return null;
    const bookings = await tx.booking.findMany({ where: { flightId } });

    let freed = 0;
    for (const b of bookings) {
      if (CANCELLED_STATUSES.includes(b.status)) continue; // already cancelled
      if (holdsSeat(b.status)) {
        freed += b.pax;
        await tx.client.update({
          where: { id: b.clientId },
          data: { tripsCount: { decrement: 1 }, totalSum: { decrement: b.total } },
        });
      }
      await tx.booking.update({ where: { id: b.id }, data: { status } });
    }

    if (freed > 0) {
      await tx.flight.update({
        where: { id: flightId },
        data: { seatsTaken: Math.max(0, flight.seatsTaken - freed) },
      });
    }
    await recomputeFlightPayment(tx, flightId);
    return flight.departAt;
  });
  // Cancelling bookings removes them from revenue/orders — recompute (desync #5).
  if (departAt) await enqueueStatsRecompute(isoDay(departAt)).catch(() => undefined);
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

    // Only attached (confirmed) bookings contribute to the client's lifetime total.
    const delta = total - booking.total;
    if (holdsSeat(booking.status) && delta !== 0) {
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
