import type { DriverFlightView } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';

function toDriverFlightView(flight: Awaited<ReturnType<typeof fetchFlight>>): DriverFlightView {
  return {
    id: flight.id,
    departAt: flight.departAt.toISOString(),
    status: flight.status as DriverFlightView['status'],
    seatsTotal: flight.seatsTotal,
    seatsTaken: flight.seatsTaken,
    pickupAddress: flight.pickupAddress,
    route: {
      fromCity: flight.route.fromCity,
      toCity: flight.route.toCity,
      durationLabel: flight.route.durationLabel,
    },
    car: flight.car ? { model: flight.car.model, plate: flight.car.plate } : null,
    passengers: flight.bookings
      .filter((b) => b.status === 'NEW' || b.status === 'CONFIRMED')
      .map((b) => ({ name: b.client.name, pax: b.pax })),
  };
}

async function fetchFlight(flightId: string) {
  return prisma.flight.findUniqueOrThrow({
    where: { id: flightId },
    include: {
      route: true,
      car: true,
      bookings: {
        where: { status: { in: ['NEW', 'CONFIRMED'] } },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

export async function listDriverFlights(driverId: string): Promise<DriverFlightView[]> {
  const flights = await prisma.flight.findMany({
    where: {
      car: { driverId },
    },
    include: {
      route: true,
      car: true,
      bookings: {
        where: { status: { in: ['NEW', 'CONFIRMED'] } },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { departAt: 'desc' },
  });
  return flights.map(toDriverFlightView);
}

export async function getDriverFlight(driverId: string, flightId: string): Promise<DriverFlightView> {
  const flight = await fetchFlight(flightId);
  if (!flight.car || flight.car.driverId !== driverId) throw Errors.notFound('Рейс');
  return toDriverFlightView(flight);
}

export async function setDriverFlightStatus(
  driverId: string,
  flightId: string,
  status: 'DEPARTED' | 'COMPLETED',
): Promise<DriverFlightView> {
  const flight = await fetchFlight(flightId);
  if (!flight.car || flight.car.driverId !== driverId) throw Errors.notFound('Рейс');

  const allowed: Record<string, string[]> = {
    SCHEDULED: ['DEPARTED'],
    CLOSED: ['DEPARTED'],
    DEPARTED: ['COMPLETED'],
  };
  if (!allowed[flight.status]?.includes(status)) {
    throw Errors.badRequest(`Нельзя перевести рейс из статуса «${flight.status}» в «${status}»`);
  }

  const updated = await prisma.flight.update({
    where: { id: flightId },
    data: { status },
    include: {
      route: true,
      car: true,
      bookings: {
        where: { status: { in: ['NEW', 'CONFIRMED'] } },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  return toDriverFlightView(updated);
}
