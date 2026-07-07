import { z } from 'zod';
import { Id } from './common.js';
import { RouteStatus } from '../enums.js';

export const Route = z.object({
  id: Id,
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  durationLabel: z.string(), // "~4 ч"
  price: z.number().int().nonnegative(), // minor units, per seat
  dailyTrips: z.number().int().nonnegative(),
  status: RouteStatus,
  popular: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Route = z.infer<typeof Route>;

export const CreateRouteInput = z.object({
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  durationLabel: z.string().min(1),
  price: z.number().int().nonnegative(),
  dailyTrips: z.number().int().nonnegative().default(0),
  status: RouteStatus.default('ACTIVE'),
  popular: z.boolean().default(false),
});
export type CreateRouteInput = z.infer<typeof CreateRouteInput>;

export const UpdateRouteInput = CreateRouteInput.partial();
export type UpdateRouteInput = z.infer<typeof UpdateRouteInput>;

export const ListRoutesQuery = z.object({
  status: RouteStatus.optional(),
  fromCity: z.string().optional(),
  toCity: z.string().optional(),
});
export type ListRoutesQuery = z.infer<typeof ListRoutesQuery>;
