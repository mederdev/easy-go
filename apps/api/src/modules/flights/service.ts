import type {
  AvailableDatesQuery,
  CreateFlightInput,
  ListFlightsQuery,
  PaymentStatus,
  SearchFlightsQuery,
  UpdateFlightInput,
} from '@easygo/shared';
import { FEW_SEATS_RATIO } from '@easygo/shared';
import type { Flight, Route, Car } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { derivePaymentStatus, recomputeFlightPayment } from '../../lib/payment.js';
import { completeFlightBookings } from '../bookings/service.js';

type FlightWithRel = Flight & { route?: Route | null; car?: Car | null };

/** Add derived seat fields used by results/list screens. */
export function toFlightView<T extends FlightWithRel>(f: T) {
  const seatsLeft = Math.max(0, f.seatsTotal - f.seatsTaken);
  return {
    ...f,
    seatsLeft,
    fewSeats: seatsLeft > 0 && seatsLeft <= Math.ceil(f.seatsTotal * FEW_SEATS_RATIO),
    soldOut: seatsLeft === 0,
  };
}

const dayRange = (date: string) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return { start, end };
};

/** Public search: bookable flights for a route + day with enough free seats. */
export async function searchFlights(q: SearchFlightsQuery) {
  const { start, end } = dayRange(q.date);
  const flights = await prisma.flight.findMany({
    where: {
      status: 'SCHEDULED',
      departAt: { gte: start, lte: end },
      route: { fromCity: q.fromCity, toCity: q.toCity, status: 'ACTIVE' },
    },
    include: { route: true, car: true },
    orderBy: { departAt: 'asc' },
  });
  return flights
    .map(toFlightView)
    .filter((f) => f.seatsLeft >= q.pax);
}

/** Returns ISO dates that have ≥1 bookable seat for the given route window. */
export async function getAvailableDates(q: AvailableDatesQuery): Promise<string[]> {
  const start = new Date(`${q.from}T00:00:00.000Z`);
  const end = new Date(`${q.to}T23:59:59.999Z`);
  const flights = await prisma.flight.findMany({
    where: {
      status: 'SCHEDULED',
      departAt: { gte: start, lte: end },
      route: { fromCity: q.fromCity, toCity: q.toCity, status: 'ACTIVE' },
    },
    select: { departAt: true, seatsTotal: true, seatsTaken: true },
  });
  const dates = new Set<string>();
  for (const f of flights) {
    if (f.seatsTotal > f.seatsTaken) {
      dates.add(f.departAt.toISOString().slice(0, 10));
    }
  }
  return [...dates].sort();
}

export async function listFlights(q: ListFlightsQuery) {
  const flights = await prisma.flight.findMany({
    where: {
      routeId: q.routeId,
      status: q.status,
      departAt: { gte: q.from ? new Date(q.from) : undefined, lte: q.to ? new Date(q.to) : undefined },
    },
    include: { route: true, car: { include: { driver: true } } },
    orderBy: { departAt: 'asc' },
  });
  return flights.map(toFlightView);
}

export async function getFlight(id: string) {
  const flight = await prisma.flight.findUnique({
    where: { id },
    include: { route: true, car: { include: { driver: true } } },
  });
  if (!flight) throw Errors.notFound('Рейс');
  return toFlightView(flight);
}

export function createFlight(input: CreateFlightInput) {
  return prisma.flight.create({
    data: {
      routeId: input.routeId,
      carId: input.carId ?? null,
      departAt: new Date(input.departAt),
      pickupLat: input.pickupLat ?? null,
      pickupLng: input.pickupLng ?? null,
      pickupAddress: input.pickupAddress ?? null,
      seatsTotal: input.seatsTotal,
      status: input.status,
    },
    include: { route: true, car: true },
  });
}

/**
 * Bulk payment action on a whole flight (admin + driver). PAID marks every active
 * booking paid and the flight paid; UNPAID re-derives each booking from its own
 * prepaid amount, then re-aggregates the flight. PARTIAL is derived, not settable.
 */
export async function setFlightPayment(id: string, status: PaymentStatus) {
  if (status === 'PARTIAL') {
    throw Errors.badRequest('Статус «Частично» вычисляется автоматически из броней');
  }
  return prisma.$transaction(async (tx) => {
    const flight = await tx.flight.findUnique({ where: { id } });
    if (!flight) throw Errors.notFound('Рейс');

    const active = await tx.booking.findMany({
      where: { flightId: id, status: { in: ['NEW', 'CONFIRMED', 'COMPLETED'] } },
      select: { id: true, prepaid: true, total: true },
    });

    for (const b of active) {
      const next = status === 'PAID' ? 'PAID' : derivePaymentStatus(b.prepaid, b.total);
      await tx.booking.update({ where: { id: b.id }, data: { paymentStatus: next } });
    }

    // PAID is an explicit bulk action: the flight is paid even if it has no
    // active bookings (recompute would force an empty flight back to UNPAID).
    // For UNPAID we re-derive so existing prepayments surface as PARTIAL.
    if (status === 'PAID') {
      await tx.flight.update({ where: { id }, data: { paymentStatus: 'PAID' } });
    } else {
      await recomputeFlightPayment(tx, id);
    }
    return getFlightInTx(tx, id);
  });
}

async function getFlightInTx(tx: Parameters<typeof recomputeFlightPayment>[0], id: string) {
  return tx.flight.findUniqueOrThrow({
    where: { id },
    include: { route: true, car: { include: { driver: true } } },
  }).then(toFlightView);
}

export async function updateFlight(id: string, input: UpdateFlightInput) {
  await getFlight(id);
  const updated = await prisma.flight.update({
    where: { id },
    data: {
      routeId: input.routeId,
      carId: input.carId,
      departAt: input.departAt ? new Date(input.departAt) : undefined,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      pickupAddress: input.pickupAddress,
      seatsTotal: input.seatsTotal,
      status: input.status,
    },
    include: { route: true, car: true },
  });
  // Completing the flight completes its confirmed bookings so passengers see it
  // as finished on their side (they display booking status, not flight status).
  if (input.status === 'COMPLETED') await completeFlightBookings(id);
  return updated;
}
