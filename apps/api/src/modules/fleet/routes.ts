import type { FastifyPluginAsync } from 'fastify';
import {
  CreateCarInput,
  UpdateCarInput,
  UpdateCarLocationInput,
  ListCarsQuery,
  Id,
  type CarStatus,
} from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';

const carInclude = { driver: true } as const;

/** Ids of cars currently out on a departed (in-progress) flight. */
async function carsOnTrip(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.flight.findMany({
    where: { status: 'DEPARTED', carId: { in: ids } },
    select: { carId: true },
  });
  return new Set(rows.map((r) => r.carId).filter((id): id is string => id !== null));
}

/** Override the stored status with ON_TRIP for cars out on a departed flight,
 *  so the fleet always reflects reality (a car on a live flight is never free). */
function applyOnTrip<T extends { id: string; status: CarStatus }>(cars: T[], onTrip: Set<string>): T[] {
  return cars.map((c) => (onTrip.has(c.id) ? { ...c, status: 'ON_TRIP' as CarStatus } : c));
}

const routes: FastifyPluginAsync = async (app) => {
  // Public: "Свободный транспорт сейчас" teaser on the client home/availability.
  // A car out on a departed flight is excluded even if its stored status is free.
  // No `driver` include: driver identity must not leak to unauthenticated clients.
  app.get('/available', async () => {
    const cars = await prisma.car.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: { locationCity: 'asc' },
    });
    const onTrip = await carsOnTrip(cars.map((c) => c.id));
    return cars.filter((c) => !onTrip.has(c.id));
  });

  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListCarsQuery, request.query);
    const cars = await prisma.car.findMany({ where: { status: q.status }, include: carInclude, orderBy: { model: 'asc' } });
    const withStatus = applyOnTrip(cars, await carsOnTrip(cars.map((c) => c.id)));
    // Keep an explicit status filter honest against the derived (real) status.
    return q.status ? withStatus.filter((c) => c.status === q.status) : withStatus;
  });

  app.get('/:id', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const car = await prisma.car.findUnique({ where: { id: parse(Id, id) }, include: carInclude });
    if (!car) throw Errors.notFound('Авто');
    return applyOnTrip([car], await carsOnTrip([car.id]))[0];
  });

  app.post('/', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const input = parse(CreateCarInput, request.body);
    reply.code(201);
    return prisma.car.create({ data: { ...input, driverId: input.driverId ?? null }, include: carInclude });
  });

  app.patch('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(UpdateCarInput, request.body);
    return prisma.car.update({ where: { id: parse(Id, id) }, data: input, include: carInclude });
  });

  // Live location ping (driver app / dispatcher) — drives the 2GIS "where's my car".
  app.patch('/:id/location', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(UpdateCarLocationInput, request.body);
    return prisma.car.update({
      where: { id: parse(Id, id) },
      data: { currentLat: input.lat, currentLng: input.lng, locationCity: input.locationCity },
      include: carInclude,
    });
  });
};

export default routes;
