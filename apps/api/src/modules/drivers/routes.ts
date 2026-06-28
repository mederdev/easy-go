import type { FastifyPluginAsync } from 'fastify';
import { CreateDriverInput, UpdateDriverInput, SetDriverPasswordInput, Id } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { parse } from '../../lib/validate.js';
import bcrypt from 'bcryptjs';

const routes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authorize(['operator', 'admin', 'owner']));

  app.get('/', async () => prisma.driver.findMany({ include: { cars: true }, orderBy: { name: 'asc' } }));

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    const driver = await prisma.driver.findUnique({ where: { id: parse(Id, id) }, include: { cars: true } });
    if (!driver) throw Errors.notFound('Водитель');
    return driver;
  });

  app.post('/', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const input = parse(CreateDriverInput, request.body);
    reply.code(201);
    return prisma.driver.create({ data: { ...input, phone: normalizePhone(input.phone) } });
  });

  app.patch('/:id', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request) => {
    const { id } = request.params as { id: string };
    const input = parse(UpdateDriverInput, request.body);
    const driverId = parse(Id, id);

    if (input.isActive === false) {
      const activeFlights = await prisma.flight.count({
        where: {
          status: { in: ['SCHEDULED', 'CLOSED', 'DEPARTED'] },
          car: { driverId },
        },
      });
      if (activeFlights > 0) {
        throw Errors.conflict(
          `У водителя есть ${activeFlights} активных рейс${activeFlights === 1 ? '' : activeFlights < 5 ? 'а' : 'ов'} — деактивация невозможна`,
          'DRIVER_HAS_ACTIVE_FLIGHTS',
        );
      }
    }

    return prisma.driver.update({
      where: { id: driverId },
      data: { ...input, phone: input.phone ? normalizePhone(input.phone) : undefined },
    });
  });

  app.post('/:id/set-password', { preHandler: [app.authorize(['admin', 'owner'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { password } = parse(SetDriverPasswordInput, request.body);
    const driverId = parse(Id, id);
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw Errors.notFound('Водитель');
    await prisma.driver.update({
      where: { id: driverId },
      data: { passwordHash: await bcrypt.hash(password, 10), passwordRaw: password },
    });
    reply.code(204);
    return null;
  });

  app.get('/:id/flights', async (request) => {
    const { id } = request.params as { id: string };
    const driverId = parse(Id, id);
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw Errors.notFound('Водитель');
    return prisma.flight.findMany({
      where: { car: { driverId } },
      include: { route: true, car: true },
      orderBy: { departAt: 'desc' },
    });
  });
};

export default routes;
