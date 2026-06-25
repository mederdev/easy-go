import type { FastifyPluginAsync } from 'fastify';
import {
  CreateCarInput,
  UpdateCarInput,
  UpdateCarLocationInput,
  ListCarsQuery,
  Id,
} from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { parse } from '../../lib/validate.js';

const carInclude = { driver: true } as const;

const routes: FastifyPluginAsync = async (app) => {
  // Public: "Свободный транспорт сейчас" teaser on the client home/availability.
  app.get('/available', async () =>
    prisma.car.findMany({ where: { status: 'AVAILABLE' }, include: carInclude, orderBy: { locationCity: 'asc' } }),
  );

  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListCarsQuery, request.query);
    return prisma.car.findMany({ where: { status: q.status }, include: carInclude, orderBy: { model: 'asc' } });
  });

  app.get('/:id', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const car = await prisma.car.findUnique({ where: { id: parse(Id, id) }, include: carInclude });
    if (!car) throw Errors.notFound('Авто');
    return car;
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
