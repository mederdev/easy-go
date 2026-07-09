import type { FastifyPluginAsync } from 'fastify';
import {
  ApplicationStatus,
  CreateCustomRequestInput,
  Id,
  ListCustomRequestsQuery,
  UpdateCustomRequestInput,
  type AdminStopInput,
  type CustomRequestAddon,
} from '@easygo/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { parse } from '../../lib/validate.js';
import { derivePaymentStatus } from '../../lib/payment.js';
import { enqueueCustomRequestNotification } from '../../lib/queue.js';

/** Resolve the registered client's name by matching the request's phone. */
async function clientNameForPhone(phone: string): Promise<string | null> {
  const client = await prisma.client.findUnique({ where: { phone }, select: { name: true } });
  return client?.name ?? null;
}

/** At most one point of each type (pickup/dropoff) per passenger. */
function assertStopsWithinPax(stops: ReadonlyArray<{ kind: string }>, pax: number): void {
  const pickups = stops.filter((s) => s.kind === 'PICKUP').length;
  const dropoffs = stops.filter((s) => s.kind === 'DROPOFF').length;
  if (pickups > pax || dropoffs > pax) {
    throw Errors.badRequest(`Точек каждого типа не может быть больше, чем пассажиров (${pax})`);
  }
}

const routes: FastifyPluginAsync = async (app) => {
  // Public: client leaves a request when no suitable flight is found
  app.post('/', { config: { idempotent: true } }, async (request, reply) => {
    const input = parse(CreateCustomRequestInput, request.body);
    assertStopsWithinPax(input.stops, input.pax);
    reply.code(201);
    const created = await prisma.customRequest.create({
      data: {
        ...input,
        phone: normalizePhone(input.phone),
        // Json column: normalize optional fields so the payload is plain JSON.
        stops: input.stops.map((s) => ({ kind: s.kind, address: s.address, note: s.note ?? null })),
      },
    });
    await enqueueCustomRequestNotification(created.id).catch(() => undefined);
    return created;
  });

  // Admin: list custom requests
  app.get('/', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const q = parse(ListCustomRequestsQuery, request.query);
    const where = q.status ? { status: q.status } : undefined;
    const [items, total] = await Promise.all([
      prisma.customRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: q.limit, skip: q.offset }),
      prisma.customRequest.count({ where }),
    ]);
    // Resolve registered client names by matching phone (Client.phone is unique).
    const phones = [...new Set(items.map((r) => r.phone))];
    const clients = phones.length
      ? await prisma.client.findMany({ where: { phone: { in: phones } }, select: { phone: true, name: true } })
      : [];
    const nameByPhone = new Map(clients.map((c) => [c.phone, c.name]));
    const enriched = items.map((r) => ({ ...r, clientName: nameByPhone.get(r.phone) ?? null }));
    return { items: enriched, total, limit: q.limit, offset: q.offset };
  });

  // Admin: update status
  app.patch('/:id/status', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const id = parse(Id, (request.params as { id: string }).id);
    const status = parse(ApplicationStatus, (request.body as { status: unknown }).status);
    const found = await prisma.customRequest.findUnique({ where: { id } });
    if (!found) throw Errors.notFound('Заявка');
    const updated = await prisma.customRequest.update({ where: { id }, data: { status } });
    return { ...updated, clientName: await clientNameForPhone(updated.phone) };
  });

  // Admin: edit trip fields + pricing (mirrors booking edit). Recomputes total and
  // the payment status from the effective per-seat price, priced points and services.
  app.patch('/:id', { preHandler: [app.authorize(['operator', 'admin', 'owner'])] }, async (request) => {
    const id = parse(Id, (request.params as { id: string }).id);
    const input = parse(UpdateCustomRequestInput, request.body);
    const found = await prisma.customRequest.findUnique({ where: { id } });
    if (!found) throw Errors.notFound('Заявка');

    // Effective values (fall back to the stored request where a field is omitted).
    const pax = input.pax ?? found.pax;
    const unitPrice = input.unitPrice !== undefined ? input.unitPrice : found.unitPrice;
    const discount = input.discount ?? found.discount;
    const stops = (input.stops ?? (found.stops as unknown as AdminStopInput[])) ?? [];
    const addons = (input.addons ?? (found.addons as unknown as CustomRequestAddon[])) ?? [];
    assertStopsWithinPax(stops, pax);

    const stopsSum = stops.reduce((sum, s) => sum + (s.price ?? 0), 0);
    const addonsSum = addons.reduce((sum, a) => sum + a.price, 0);
    const gross = (unitPrice ?? 0) * pax + stopsSum + addonsSum;
    const total = Math.max(0, gross - Math.min(discount, gross));
    const prepaidRaw = input.prepaid !== undefined ? input.prepaid : found.prepaid;
    const prepaid = Math.min(prepaidRaw, total);
    const paymentStatus = input.paymentStatus ?? derivePaymentStatus(prepaid, total);

    const data: Prisma.CustomRequestUpdateInput = {
      pax,
      unitPrice,
      discount,
      prepaid,
      total,
      paymentStatus,
      stops: stops.map((s) => ({ kind: s.kind, address: s.address, note: s.note ?? null, price: s.price ?? null })),
      addons: addons.map((a) => ({ name: a.name, price: a.price })),
    };
    if (input.date !== undefined) data.date = input.date;
    if (input.time !== undefined) data.time = input.time;
    if (input.carType !== undefined) data.carType = input.carType;
    if (input.features !== undefined) data.features = input.features;
    if (input.wholeCabin !== undefined) data.wholeCabin = input.wholeCabin;
    if (input.comment !== undefined) data.comment = input.comment;

    const updated = await prisma.customRequest.update({ where: { id }, data });
    return { ...updated, clientName: await clientNameForPhone(updated.phone) };
  });
};

export default routes;
