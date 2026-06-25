import { z } from 'zod';
import { Id } from './common.js';

/** A precomputed per-route, per-day stat row (source of all analytics). */
export const DailyStat = z.object({
  id: Id,
  date: z.string().date(),
  routeId: Id.nullable(),
  ordersCount: z.number().int().nonnegative(),
  revenue: z.number().int().nonnegative(), // minor units
  newClients: z.number().int().nonnegative(),
  returningClients: z.number().int().nonnegative(),
});
export type DailyStat = z.infer<typeof DailyStat>;

/** Dashboard "today" summary cards. */
export const DashboardSummary = z.object({
  date: z.string().date(),
  ordersToday: z.number().int(),
  revenueToday: z.number().int(), // minor units
  newBookings: z.number().int(),
  seatsSoldToday: z.number().int(),
  activeFlights: z.number().int(),
  availableCars: z.number().int(),
});
export type DashboardSummary = z.infer<typeof DashboardSummary>;

export const AnalyticsQuery = z.object({
  from: z.string().date(),
  to: z.string().date(),
  routeId: Id.optional(),
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuery>;

export const AnalyticsSeries = z.object({
  from: z.string().date(),
  to: z.string().date(),
  totalOrders: z.number().int(),
  totalRevenue: z.number().int(),
  points: z.array(DailyStat),
});
export type AnalyticsSeries = z.infer<typeof AnalyticsSeries>;
