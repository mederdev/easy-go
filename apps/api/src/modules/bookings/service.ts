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

/**
 * Create a booking. Upserts the client by phone, reserves seats atomically, and
 * keeps denormalized counters in sync. Safe to retry behind an Idempotency-Key.
 */
export async function createBooking(
  input: CreateBookingInput,
  opts: {
    status?: BookingStatus;
    /** Per-seat price override (minor units); omit to use the route price. */
    unitPrice?: number;
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

    // Price/discount/prepayment are admin-only; the public flow leaves the price
    // at the route default and the rest at 0. A per-seat override lets operators
    // split the salon price when a flight doesn't fill up.
    const unitPrice = opts.unitPrice ?? null;
    const effectiveUnit = unitPrice ?? flight.route.price;
    const gross = effectiveUnit * input.pax;
    const discount = Math.min(opts.discount ?? 0, gross);
    const total = Math.max(0, gross - discount);
    const prepaid = Math.min(opts.prepaid ?? 0, total);

    // Create, then stamp a human code derived from the autoincrement seq.
    const created = await tx.booking.create({
      data: {
        code: `tmp-${randomUUID()}`,
        clientId: client.id,
        flightId: flight.id,
        pax: input.pax,
        unitPrice,
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
    unitPrice: input.unitPrice,
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
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw Errors.notFound('Бронирование');
    if (booking.status === status) return tx.booking.findUnique({ where: { id }, include: bookingInclude });

    // A booking is only "completed" as a consequence of its flight completing
    // (see `completeFlightBookings`). Block completing a booking whose flight
    // hasn't finished yet.
    if (status === 'COMPLETED') {
      const flight = await tx.flight.findUnique({ where: { id: booking.flightId } });
      if (!flight) throw Errors.notFound('Рейс');
      if (flight.status !== 'COMPLETED') {
        throw Errors.conflict('Рейс ещё не завершён', 'FLIGHT_NOT_COMPLETED');
      }
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
 * Admin-only edit of a booking's mutable fields (flight, passengers, per-seat
 * price, discount, prepayment, comment). Reconciles seat counters when the flight
 * or passenger count changes on an attached booking (freeing the old flight and
 * reserving on the new one), recomputes `total` from the effective per-seat price
 * against the target flight's route, clamps prepaid, re-derives the payment
 * status, keeps the denormalized client total in sync, and re-aggregates every
 * affected flight.
 */
export async function updateBookingPayment(id: string, input: UpdateBookingPaymentInput) {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: { flight: { include: { route: true } } },
    });
    if (!booking) throw Errors.notFound('Бронирование');

    const pax = input.pax ?? booking.pax;
    const held = holdsSeat(booking.status);
    const flightChanged = input.flightId !== undefined && input.flightId !== booking.flightId;

    // Resolve the flight the booking will belong to after this edit.
    const target = flightChanged
      ? await tx.flight.findUnique({ where: { id: input.flightId! }, include: { route: true } })
      : booking.flight;
    if (!target) throw Errors.notFound('Рейс');
    if (flightChanged && target.status !== 'SCHEDULED') {
      throw Errors.conflict('Рейс закрыт для бронирования', 'FLIGHT_CLOSED');
    }

    // Reconcile flight capacity. Only attached (seat-holding) bookings move seats;
    // NEW/cancelled bookings hold nothing, so their pax/flight edits are free until
    // confirmation re-checks availability.
    if (held && flightChanged) {
      // Free the whole booking off the old flight…
      const oldTaken = Math.max(0, booking.flight.seatsTaken - booking.pax);
      await tx.flight.update({
        where: { id: booking.flightId },
        data: {
          seatsTaken: oldTaken,
          status:
            booking.flight.status === 'CLOSED' && oldTaken < booking.flight.seatsTotal
              ? 'SCHEDULED'
              : booking.flight.status,
        },
      });
      // …and reserve it on the new one.
      const seatsLeft = target.seatsTotal - target.seatsTaken;
      if (seatsLeft < pax) {
        throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
      }
      const newTaken = target.seatsTaken + pax;
      await tx.flight.update({
        where: { id: target.id },
        data: { seatsTaken: newTaken, status: newTaken >= target.seatsTotal ? 'CLOSED' : target.status },
      });
    } else if (held && pax !== booking.pax) {
      // Same flight, passenger count changed: adjust the delta only.
      const paxDelta = pax - booking.pax;
      if (paxDelta > 0) {
        const seatsLeft = target.seatsTotal - target.seatsTaken;
        if (seatsLeft < paxDelta) {
          throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
        }
      }
      const newTaken = Math.max(0, target.seatsTaken + paxDelta);
      await tx.flight.update({
        where: { id: target.id },
        data: {
          seatsTaken: newTaken,
          status:
            newTaken >= target.seatsTotal ? 'CLOSED' : target.status === 'CLOSED' ? 'SCHEDULED' : target.status,
        },
      });
    }

    // `unitPrice === undefined` keeps the stored override (or route default);
    // an explicit `null` clears it back to the target flight's route price.
    const unitPrice = input.unitPrice !== undefined ? input.unitPrice : booking.unitPrice;
    const effectiveUnit = unitPrice ?? target.route.price;
    const gross = effectiveUnit * pax;
    const discount = Math.min(Math.max(0, input.discount ?? booking.discount), gross);
    const total = Math.max(0, gross - discount);
    const prepaid = Math.min(Math.max(0, input.prepaid ?? booking.prepaid), total);
    const paymentStatus = derivePaymentStatus(prepaid, total);
    const comment = input.comment !== undefined ? input.comment : booking.comment;

    const updated = await tx.booking.update({
      where: { id },
      data: { flightId: target.id, pax, unitPrice, discount, prepaid, total, paymentStatus, comment },
      include: bookingInclude,
    });

    // Only attached (confirmed) bookings contribute to the client's lifetime total.
    const delta = total - booking.total;
    if (held && delta !== 0) {
      await tx.client.update({
        where: { id: booking.clientId },
        data: { totalSum: { increment: delta } },
      });
    }

    // Re-aggregate every flight this edit touched.
    await recomputeFlightPayment(tx, target.id);
    if (flightChanged) await recomputeFlightPayment(tx, booking.flightId);
    return { booking: updated, departAt: target.departAt, oldDepartAt: booking.flight.departAt };
  });

  await enqueueStatsRecompute(isoDay(result.departAt)).catch(() => undefined);
  if (isoDay(result.oldDepartAt) !== isoDay(result.departAt)) {
    await enqueueStatsRecompute(isoDay(result.oldDepartAt)).catch(() => undefined);
  }
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
