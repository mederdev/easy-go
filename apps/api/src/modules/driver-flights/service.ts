import type { DriverFlightView, PaymentStatus } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { completeFlightBookings, setBookingPaymentStatus } from '../bookings/service.js';
import { setFlightPayment } from '../flights/service.js';

function toDriverFlightView(flight: Awaited<ReturnType<typeof fetchFlight>>): DriverFlightView {
  return {
    id: flight.id,
    departAt: flight.departAt.toISOString(),
    status: flight.status as DriverFlightView['status'],
    paymentStatus: flight.paymentStatus as DriverFlightView['paymentStatus'],
    seatsTotal: flight.seatsTotal,
    seatsTaken: flight.seatsTaken,
    pickupAddress: flight.pickupAddress,
    dropoffAddress: flight.dropoffAddress,
    route: {
      fromCity: flight.route.fromCity,
      toCity: flight.route.toCity,
      durationLabel: flight.route.durationLabel,
    },
    car: flight.car ? { model: flight.car.model, plate: flight.car.plate } : null,
    passengers: flight.bookings
      .filter((b) => b.status === 'NEW' || b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .map((b) => ({
        bookingId: b.id,
        name: b.client.name,
        phone: b.client.phone ?? '', // Telegram signups may have no phone yet
        whatsapp: b.client.whatsapp,
        pax: b.pax,
        total: b.total,
        prepaid: b.prepaid,
        discount: b.discount,
        paymentStatus: b.paymentStatus as DriverFlightView['paymentStatus'],
        stops: b.stops.map((s) => ({
          id: s.id,
          kind: s.kind as 'PICKUP' | 'DROPOFF',
          address: s.address,
          note: s.note,
          price: s.price,
          pickedUp: s.pickedUp,
          order: s.order,
        })),
      })),
  };
}

async function fetchFlight(flightId: string) {
  return prisma.flight.findUniqueOrThrow({
    where: { id: flightId },
    include: {
      route: true,
      car: true,
      bookings: {
        where: { status: { in: ['NEW', 'CONFIRMED', 'COMPLETED'] } },
        include: { client: { select: { name: true, phone: true, whatsapp: true } }, stops: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/** Throws unless `flightId` belongs to a car driven by `driverId`. */
async function assertDriverOwnsFlight(driverId: string, flightId: string) {
  const flight = await prisma.flight.findUnique({ where: { id: flightId }, include: { car: true } });
  if (!flight || !flight.car || flight.car.driverId !== driverId) throw Errors.notFound('Рейс');
  return flight;
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
        where: { status: { in: ['NEW', 'CONFIRMED', 'COMPLETED'] } },
        include: { client: { select: { name: true, phone: true, whatsapp: true } }, stops: { orderBy: { order: 'asc' } } },
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

  if (status === 'DEPARTED' && new Date() < flight.departAt) {
    throw Errors.badRequest('Нельзя отметить рейс как «Выехал» до времени отправления');
  }

  await prisma.flight.update({ where: { id: flightId }, data: { status } });
  // Completing the flight completes its confirmed bookings so passengers see it
  // as finished on their side (they display booking status, not flight status).
  if (status === 'COMPLETED') await completeFlightBookings(flightId);

  return getDriverFlight(driverId, flightId);
}

/** Driver marks one booking on their flight paid/unpaid (status only, no amounts). */
export async function setDriverBookingPayment(
  driverId: string,
  flightId: string,
  bookingId: string,
  status: PaymentStatus,
): Promise<DriverFlightView> {
  await assertDriverOwnsFlight(driverId, flightId);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { flightId: true } });
  if (!booking || booking.flightId !== flightId) throw Errors.notFound('Бронирование');

  await setBookingPaymentStatus(bookingId, status);
  return getDriverFlight(driverId, flightId);
}

/** Driver ticks/unticks "collected the passenger at this stop" on their flight. */
export async function setDriverStopPicked(
  driverId: string,
  flightId: string,
  bookingId: string,
  stopId: string,
  pickedUp: boolean,
): Promise<DriverFlightView> {
  await assertDriverOwnsFlight(driverId, flightId);
  const stop = await prisma.bookingStop.findUnique({
    where: { id: stopId },
    include: { booking: { select: { id: true, flightId: true } } },
  });
  if (!stop || stop.bookingId !== bookingId || stop.booking.flightId !== flightId) {
    throw Errors.notFound('Точка');
  }
  await prisma.bookingStop.update({ where: { id: stopId }, data: { pickedUp } });
  return getDriverFlight(driverId, flightId);
}

/** Driver bulk-marks the whole flight paid/unpaid (cascades to its bookings). */
export async function setDriverFlightPayment(
  driverId: string,
  flightId: string,
  status: PaymentStatus,
): Promise<DriverFlightView> {
  await assertDriverOwnsFlight(driverId, flightId);
  await setFlightPayment(flightId, status);
  return getDriverFlight(driverId, flightId);
}
