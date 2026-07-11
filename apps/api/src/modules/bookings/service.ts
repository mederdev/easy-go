import { randomUUID } from 'node:crypto';
import type {
  AddBookingAddonInput,
  AdminCreateBookingInput,
  AdminStopInput,
  BookingStatus,
  CreateBookingInput,
  ListBookingsQuery,
  PaymentStatus,
  UpdateBookingAddonInput,
  UpdateBookingPaymentInput,
  UpdateStopInput,
} from '@easygo/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { enqueueBookingNotification, enqueueStatsRecompute } from '../../lib/queue.js';
import { derivePaymentStatus, recomputeFlightPayment } from '../../lib/payment.js';

const bookingInclude = {
  client: true,
  flight: { include: { route: true, car: { include: { driver: true } } } },
  stops: { orderBy: { order: 'asc' as const } },
  addons: { orderBy: { order: 'asc' as const } },
} as const;

/** Sum of admin-confirmed stop prices on a booking (minor units). */
async function stopsPriceSum(tx: Prisma.TransactionClient, bookingId: string): Promise<number> {
  const agg = await tx.bookingStop.aggregate({ where: { bookingId }, _sum: { price: true } });
  return agg._sum.price ?? 0;
}

/** Sum of attached extra-service (add-on) prices on a booking (minor units). */
async function addonsPriceSum(tx: Prisma.TransactionClient, bookingId: string): Promise<number> {
  const agg = await tx.bookingAddon.aggregate({ where: { bookingId }, _sum: { price: true } });
  return agg._sum.price ?? 0;
}

/**
 * A booking may hold at most one pickup point and one dropoff point per
 * passenger, so pickups ≤ pax and dropoffs ≤ pax — counted independently
 * (pax=2 → up to 2 pickups AND up to 2 dropoffs).
 */
function assertStopsWithinPax(stops: ReadonlyArray<{ kind: string }>, pax: number): void {
  const pickups = stops.filter((s) => s.kind === 'PICKUP').length;
  const dropoffs = stops.filter((s) => s.kind === 'DROPOFF').length;
  if (pickups > pax || dropoffs > pax) {
    throw Errors.badRequest(`Точек каждого типа не может быть больше, чем пассажиров (${pax})`);
  }
}

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
 * How many seats a booking occupies on its flight. A whole-cabin ("салон")
 * booking locks the entire car regardless of how many passengers actually
 * travel — the client may take the salon with fewer people than seats and let
 * the admin offer the spare seats to someone else (over WhatsApp, outside the
 * app). So seat counters must reconcile against this, never against `pax`
 * directly: for a whole-cabin booking `pax` (real passengers) can be < seatsTotal.
 */
function seatsHeldBy(booking: { wholeCabin: boolean; pax: number }, seatsTotal: number): number {
  return booking.wholeCabin ? seatsTotal : booking.pax;
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
    // "Салон" buys the whole car: priced at the flight's flat cabinPrice and
    // reserving every seat, so it needs a cabin price and an otherwise-empty
    // flight (no seats may be split off to other passengers).
    const wholeCabin = input.wholeCabin ?? false;
    if (wholeCabin) {
      if (flight.cabinPrice == null) {
        throw Errors.badRequest('Для этого рейса не задана цена салона');
      }
      if (flight.seatsTaken > 0) {
        throw Errors.conflict('Салон недоступен: на рейсе уже есть брони', 'CABIN_UNAVAILABLE');
      }
      if (input.pax > flight.seatsTotal) {
        throw Errors.badRequest(`Пассажиров больше, чем мест в салоне (${flight.seatsTotal})`);
      }
    }
    // Record the client's actual passenger count — even for a whole cabin, where
    // they may travel with fewer people than seats. What differs is seat
    // *reservation*: a whole-cabin booking locks every seat on the car so no one
    // else can book it, while `pax` still reflects who's really coming.
    const pax = input.pax;
    const seatsHeld = wholeCabin ? flight.seatsTotal : pax;

    // Only a confirmed booking is "attached" (reserves seats). NEW requests don't
    // consume capacity, so several may await confirmation — seats are checked and
    // reserved when the admin confirms.
    const reservesSeat = holdsSeat(status);
    if (reservesSeat) {
      const seatsLeft = flight.seatsTotal - flight.seatsTaken;
      if (seatsLeft < seatsHeld) {
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
    // Stops from the public flow carry no price (an admin confirms each one
    // later); operator-entered stops may be priced immediately and then count
    // toward the total.
    const stops = (input.stops ?? []) as AdminStopInput[];
    assertStopsWithinPax(stops, pax);
    const stopsSum = stops.reduce((sum, s) => sum + (s.price ?? 0), 0);
    // Whole-cabin bookings ignore the per-seat price: the base is the flat cabin
    // price. Otherwise it's the (optionally overridden) per-seat price × pax.
    const unitPrice = wholeCabin ? null : (opts.unitPrice ?? null);
    // Per-seat base: an explicit override wins, else the flight's own seat price,
    // else the route default.
    const base = wholeCabin ? flight.cabinPrice! : (unitPrice ?? flight.seatPrice ?? flight.route.price) * pax;
    const gross = base + stopsSum;
    const discount = Math.min(opts.discount ?? 0, gross);
    const total = Math.max(0, gross - discount);
    const prepaid = Math.min(opts.prepaid ?? 0, total);

    // Create, then stamp a human code derived from the autoincrement seq.
    const created = await tx.booking.create({
      data: {
        code: `tmp-${randomUUID()}`,
        clientId: client.id,
        flightId: flight.id,
        pax,
        wholeCabin,
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
    if (stops.length) {
      await tx.bookingStop.createMany({
        data: stops.map((s, i) => ({
          bookingId: created.id,
          kind: s.kind ?? 'PICKUP',
          address: s.address,
          note: s.note ?? null,
          price: s.price ?? null,
          order: i,
        })),
      });
    }
    const withCode = await tx.booking.update({
      where: { id: created.id },
      data: { code: `№${1000 + created.seq}` },
      include: bookingInclude,
    });

    // Reserve seats + bump lifetime trip counters only for an already-confirmed
    // booking; a NEW request stays unattached until an admin confirms it.
    if (reservesSeat) {
      const newTaken = flight.seatsTaken + seatsHeld;
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
  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw Errors.notFound('Бронирование');
    if (booking.status === status) return tx.booking.findUnique({ where: { id }, include: bookingInclude });

    if (!ALLOWED_TRANSITIONS[booking.status].includes(status)) {
      throw Errors.badRequest(`Нельзя перевести бронирование из статуса «${booking.status}» в «${status}»`);
    }
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
      // A whole-cabin booking reserves the entire car, not just its passengers.
      const seatsHeld = seatsHeldBy(booking, flight.seatsTotal);
      const seatsLeft = flight.seatsTotal - flight.seatsTaken;
      if (seatsLeft < seatsHeld) {
        throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
      }
      const newTaken = flight.seatsTaken + seatsHeld;
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
        const newTaken = Math.max(0, flight.seatsTaken - seatsHeldBy(booking, flight.seatsTotal));
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
        freed += seatsHeldBy(b, flight.seatsTotal);
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
      include: { flight: { include: { route: true } }, stops: true, addons: true },
    });
    if (!booking) throw Errors.notFound('Бронирование');

    const pax = input.pax ?? booking.pax;
    // Points are capped per type at pax, so block shrinking pax below the
    // busiest type's count (operator removes the extra points first).
    if (input.pax !== undefined) {
      const pickups = booking.stops.filter((s) => s.kind === 'PICKUP').length;
      const dropoffs = booking.stops.filter((s) => s.kind === 'DROPOFF').length;
      const busiest = Math.max(pickups, dropoffs);
      if (pax < busiest) {
        throw Errors.badRequest(
          `Пассажиров меньше, чем точек одного типа (${busiest}). Сначала удалите лишние точки.`,
        );
      }
    }
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

    // Reconcile flight capacity against seats *held*, not raw pax: a whole-cabin
    // booking locks the whole car, so editing its pax leaves seat counts unchanged.
    // Only attached (seat-holding) bookings move seats; NEW/cancelled bookings hold
    // nothing, so their pax/flight edits are free until confirmation re-checks.
    const oldSeatsHeld = seatsHeldBy(booking, booking.flight.seatsTotal);
    const newSeatsHeld = seatsHeldBy({ wholeCabin: booking.wholeCabin, pax }, target.seatsTotal);
    if (held && flightChanged) {
      // Free the whole booking off the old flight…
      const oldTaken = Math.max(0, booking.flight.seatsTaken - oldSeatsHeld);
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
      if (seatsLeft < newSeatsHeld) {
        throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
      }
      const newTaken = target.seatsTaken + newSeatsHeld;
      await tx.flight.update({
        where: { id: target.id },
        data: { seatsTaken: newTaken, status: newTaken >= target.seatsTotal ? 'CLOSED' : target.status },
      });
    } else if (held && newSeatsHeld !== oldSeatsHeld) {
      // Same flight, seats held changed: adjust the delta only.
      const seatsDelta = newSeatsHeld - oldSeatsHeld;
      if (seatsDelta > 0) {
        const seatsLeft = target.seatsTotal - target.seatsTaken;
        if (seatsLeft < seatsDelta) {
          throw Errors.conflict(`Недостаточно мест: осталось ${seatsLeft}`, 'NOT_ENOUGH_SEATS');
        }
      }
      const newTaken = Math.max(0, target.seatsTaken + seatsDelta);
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
    // Confirmed stop prices and attached extra services are part of the total
    // alongside the seats.
    const stopsSum = booking.stops.reduce((sum, s) => sum + (s.price ?? 0), 0);
    const addonsSum = booking.addons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = input.unitPrice !== undefined ? input.unitPrice : booking.unitPrice;
    const effectiveUnit = unitPrice ?? target.seatPrice ?? target.route.price;
    // A whole-cabin booking is priced at the flight's flat cabin price, not per seat.
    const base = booking.wholeCabin ? (target.cabinPrice ?? effectiveUnit * pax) : effectiveUnit * pax;
    const gross = base + stopsSum + addonsSum;
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

// ── Pickup/dropoff points (точки сбора и развоза) ──

/** Who is editing a stop: the CRM, or the booking's own client (restricted). */
export type StopActor = { role: 'admin' } | { role: 'client'; clientId: string };

/**
 * Load the booking a stop operation targets, enforcing the actor's rights: a
 * client may only touch their own booking while it's still active (NEW or
 * CONFIRMED) and the flight hasn't departed. Admins are unrestricted.
 */
async function getStopBooking(tx: Prisma.TransactionClient, bookingId: string, actor: StopActor) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { flight: true, stops: true },
  });
  if (!booking) throw Errors.notFound('Бронирование');
  if (actor.role === 'client') {
    if (booking.clientId !== actor.clientId) throw Errors.notFound('Бронирование');
    if (booking.status !== 'NEW' && booking.status !== 'CONFIRMED') {
      throw Errors.conflict('Точки можно менять только в активной брони', 'STOPS_LOCKED');
    }
    if (booking.flight.departAt.getTime() <= Date.now()) {
      throw Errors.conflict('Поездка уже началась — изменение точек недоступно', 'TOO_LATE');
    }
  }
  return booking;
}

/**
 * Re-derive a booking's money after a stop or add-on change: confirmed stop
 * prices and attached extra-service prices are part of the total, so
 * total/prepaid/paymentStatus, the client's lifetime sum and the flight's
 * payment aggregate all follow.
 */
async function recomputeBookingMoney(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { flight: { include: { route: true } } },
  });
  if (!booking) throw Errors.notFound('Бронирование');

  const stopsSum = await stopsPriceSum(tx, bookingId);
  const addonsSum = await addonsPriceSum(tx, bookingId);
  const effectiveUnit = booking.unitPrice ?? booking.flight.seatPrice ?? booking.flight.route.price;
  // A whole-cabin booking is priced at the flight's flat cabin price, not per seat.
  const base = booking.wholeCabin
    ? (booking.flight.cabinPrice ?? effectiveUnit * booking.pax)
    : effectiveUnit * booking.pax;
  const gross = base + stopsSum + addonsSum;
  const discount = Math.min(booking.discount, gross);
  const total = Math.max(0, gross - discount);
  const prepaid = Math.min(booking.prepaid, total);

  const updated = await tx.booking.update({
    where: { id: bookingId },
    data: { discount, total, prepaid, paymentStatus: derivePaymentStatus(prepaid, total) },
    include: bookingInclude,
  });
  // Only attached (confirmed) bookings contribute to the client's lifetime total.
  if (holdsSeat(booking.status) && total !== booking.total) {
    await tx.client.update({
      where: { id: booking.clientId },
      data: { totalSum: { increment: total - booking.total } },
    });
  }
  await recomputeFlightPayment(tx, booking.flightId);
  return updated;
}

/** Add a pickup/dropoff point. Only admins may set the price. */
export async function addBookingStop(bookingId: string, input: AdminStopInput, actor: StopActor) {
  return prisma.$transaction(async (tx) => {
    const booking = await getStopBooking(tx, bookingId, actor);
    // At most one point of each type per passenger (pickups and dropoffs counted apart).
    const kind = input.kind ?? 'PICKUP';
    if (booking.stops.filter((s) => s.kind === kind).length >= booking.pax) {
      throw Errors.conflict(
        `Точек этого типа не может быть больше, чем пассажиров (${booking.pax})`,
        'TOO_MANY_STOPS',
      );
    }
    const order = booking.stops.reduce((max, s) => Math.max(max, s.order), -1) + 1;
    await tx.bookingStop.create({
      data: {
        bookingId,
        kind,
        address: input.address,
        note: input.note ?? null,
        price: actor.role === 'admin' ? (input.price ?? null) : null,
        order,
      },
    });
    return recomputeBookingMoney(tx, bookingId);
  });
}

/**
 * Edit a point. A client changing the address drops the confirmed price back
 * to null — the admin re-confirms it on contact.
 */
export async function updateBookingStop(
  bookingId: string,
  stopId: string,
  input: UpdateStopInput,
  actor: StopActor,
) {
  return prisma.$transaction(async (tx) => {
    const booking = await getStopBooking(tx, bookingId, actor);
    const stop = booking.stops.find((s) => s.id === stopId);
    if (!stop) throw Errors.notFound('Точка');

    // Switching a point's type must respect that type's per-passenger cap.
    const kind = input.kind ?? stop.kind;
    if (
      kind !== stop.kind &&
      booking.stops.filter((s) => s.id !== stopId && s.kind === kind).length >= booking.pax
    ) {
      throw Errors.conflict(
        `Точек этого типа не может быть больше, чем пассажиров (${booking.pax})`,
        'TOO_MANY_STOPS',
      );
    }

    const addressChanged = input.address !== undefined && input.address !== stop.address;
    const price =
      actor.role === 'admin'
        ? input.price !== undefined
          ? input.price
          : stop.price
        : addressChanged
          ? null
          : stop.price;

    await tx.bookingStop.update({
      where: { id: stopId },
      data: {
        kind,
        address: input.address ?? stop.address,
        note: input.note !== undefined ? input.note : stop.note,
        price,
      },
    });
    return recomputeBookingMoney(tx, bookingId);
  });
}

/** Remove a point (its confirmed price leaves the total as well). */
export async function deleteBookingStop(bookingId: string, stopId: string, actor: StopActor) {
  return prisma.$transaction(async (tx) => {
    const booking = await getStopBooking(tx, bookingId, actor);
    const stop = booking.stops.find((s) => s.id === stopId);
    if (!stop) throw Errors.notFound('Точка');
    await tx.bookingStop.delete({ where: { id: stopId } });
    return recomputeBookingMoney(tx, bookingId);
  });
}

// ── Extra services (доп. услуги) — admin-only, priced into the total ──

/**
 * Attach an extra service to a booking. When `addonId` points at a catalog
 * entry we snapshot its name/price; an explicit `name`/`price` in the payload
 * overrides the snapshot (or stands alone for an ad-hoc service). The snapshot
 * insulates the booking from later catalog edits/archival.
 */
export async function addBookingAddon(bookingId: string, input: AddBookingAddonInput) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { addons: true },
    });
    if (!booking) throw Errors.notFound('Бронирование');

    let name = input.name?.trim();
    let price = input.price;
    let addonId: string | null = null;
    if (input.addonId) {
      const addon = await tx.serviceAddon.findUnique({ where: { id: input.addonId } });
      if (!addon || addon.status === 'ARCHIVED') throw Errors.notFound('Услуга');
      addonId = addon.id;
      name = name || addon.name;
      price = price ?? addon.price;
    }
    if (!name) throw Errors.badRequest('Укажите услугу');

    const order = booking.addons.reduce((max, a) => Math.max(max, a.order), -1) + 1;
    await tx.bookingAddon.create({
      data: { bookingId, addonId, name, price: price ?? 0, order },
    });
    return recomputeBookingMoney(tx, bookingId);
  });
}

/** Edit an attached service's name or price. */
export async function updateBookingAddon(
  bookingId: string,
  addonRowId: string,
  input: UpdateBookingAddonInput,
) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.bookingAddon.findUnique({ where: { id: addonRowId } });
    if (!row || row.bookingId !== bookingId) throw Errors.notFound('Услуга');
    await tx.bookingAddon.update({
      where: { id: addonRowId },
      data: {
        name: input.name !== undefined ? input.name.trim() : row.name,
        price: input.price !== undefined ? input.price : row.price,
      },
    });
    return recomputeBookingMoney(tx, bookingId);
  });
}

/** Remove an attached service (its price leaves the total as well). */
export async function deleteBookingAddon(bookingId: string, addonRowId: string) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.bookingAddon.findUnique({ where: { id: addonRowId } });
    if (!row || row.bookingId !== bookingId) throw Errors.notFound('Услуга');
    await tx.bookingAddon.delete({ where: { id: addonRowId } });
    return recomputeBookingMoney(tx, bookingId);
  });
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
