import type {
  AvailableDatesQuery,
  CreateFlightInput,
  ListFlightsQuery,
  SearchFlightsQuery,
  UpdateFlightInput,
} from '@easygo/shared';
import { FEW_SEATS_RATIO } from '@easygo/shared';
import type { Flight, Route, Car } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';

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

export async function updateFlight(id: string, input: UpdateFlightInput) {
  await getFlight(id);
  return prisma.flight.update({
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
}
