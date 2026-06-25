import type { AnalyticsQuery } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';

function dayBounds(date: string) {
  return { start: new Date(`${date}T00:00:00.000Z`), end: new Date(`${date}T23:59:59.999Z`) };
}

const isCancelled = { not: 'CANCELLED' as const };

/**
 * Recompute DailyStat rows for one date (by flight departure day), grouped by
 * route. Idempotent: deletes and re-inserts that day's rows. Called by the
 * BullMQ `stats` worker after bookings change.
 */
export async function recomputeDailyStats(date: string): Promise<void> {
  const { start, end } = dayBounds(date);
  const bookings = await prisma.booking.findMany({
    where: { status: isCancelled, flight: { departAt: { gte: start, lte: end } } },
    include: { flight: { select: { routeId: true } }, client: { select: { id: true, createdAt: true } } },
  });

  type Agg = { ordersCount: number; revenue: number; clients: Set<string>; newClients: Set<string> };
  const byRoute = new Map<string, Agg>();

  for (const b of bookings) {
    const routeId = b.flight.routeId;
    let agg = byRoute.get(routeId);
    if (!agg) {
      agg = { ordersCount: 0, revenue: 0, clients: new Set(), newClients: new Set() };
      byRoute.set(routeId, agg);
    }
    agg.ordersCount += 1;
    agg.revenue += b.total;
    agg.clients.add(b.client.id);
    if (b.client.createdAt >= start && b.client.createdAt <= end) agg.newClients.add(b.client.id);
  }

  await prisma.$transaction([
    prisma.dailyStat.deleteMany({ where: { date: start } }),
    ...[...byRoute.entries()].map(([routeId, agg]) =>
      prisma.dailyStat.create({
        data: {
          date: start,
          routeId,
          ordersCount: agg.ordersCount,
          revenue: agg.revenue,
          newClients: agg.newClients.size,
          returningClients: agg.clients.size - agg.newClients.size,
        },
      }),
    ),
  ]);
}

/** Live "today" dashboard summary (not from DailyStat — always fresh). */
export async function dashboardSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = dayBounds(today);

  const [todays, newBookings, activeFlights, availableCars] = await Promise.all([
    prisma.booking.findMany({
      where: { status: isCancelled, flight: { departAt: { gte: start, lte: end } } },
      select: { total: true, pax: true },
    }),
    prisma.booking.count({ where: { status: 'NEW' } }),
    prisma.flight.count({ where: { status: 'SCHEDULED', departAt: { gte: start, lte: end } } }),
    prisma.car.count({ where: { status: 'AVAILABLE' } }),
  ]);

  return {
    date: today,
    ordersToday: todays.length,
    revenueToday: todays.reduce((s, b) => s + b.total, 0),
    newBookings,
    seatsSoldToday: todays.reduce((s, b) => s + b.pax, 0),
    activeFlights,
    availableCars,
  };
}

export async function analyticsSeries(q: AnalyticsQuery) {
  const from = new Date(`${q.from}T00:00:00.000Z`);
  const to = new Date(`${q.to}T23:59:59.999Z`);
  const points = await prisma.dailyStat.findMany({
    where: { date: { gte: from, lte: to }, routeId: q.routeId },
    orderBy: { date: 'asc' },
  });
  return {
    from: q.from,
    to: q.to,
    totalOrders: points.reduce((s, p) => s + p.ordersCount, 0),
    totalRevenue: points.reduce((s, p) => s + p.revenue, 0),
    points,
  };
}
