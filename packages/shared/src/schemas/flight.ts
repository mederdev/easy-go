import { z } from 'zod';
import { Id } from './common.js';
import { FlightStatus } from '../enums.js';
import { Route } from './route.js';
import { Car } from './car.js';

export const Flight = z.object({
  id: Id,
  routeId: Id,
  route: Route.optional(),
  carId: Id.nullable(),
  car: Car.nullable().optional(),
  departAt: z.string().datetime(),
  pickupLat: z.number().nullable(),
  pickupLng: z.number().nullable(),
  pickupAddress: z.string().nullable(),
  seatsTotal: z.number().int().positive(),
  seatsTaken: z.number().int().nonnegative(), // denormalized
  status: FlightStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Flight = z.infer<typeof Flight>;

/** Flight enriched with derived fields for list/results screens. */
export const FlightView = Flight.extend({
  seatsLeft: z.number().int().nonnegative(),
  fewSeats: z.boolean(),
  soldOut: z.boolean(),
});
export type FlightView = z.infer<typeof FlightView>;

export const CreateFlightInput = z.object({
  routeId: Id,
  carId: Id.nullish(),
  departAt: z.string().datetime(),
  pickupLat: z.number().nullish(),
  pickupLng: z.number().nullish(),
  pickupAddress: z.string().nullish(),
  seatsTotal: z.number().int().positive().default(11),
  status: FlightStatus.default('SCHEDULED'),
});
export type CreateFlightInput = z.infer<typeof CreateFlightInput>;

export const UpdateFlightInput = CreateFlightInput.partial();
export type UpdateFlightInput = z.infer<typeof UpdateFlightInput>;

/** Public search (client app): find available flights for a route + day. */
export const SearchFlightsQuery = z.object({
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  date: z.string().date(), // YYYY-MM-DD, departures within that local day
  pax: z.coerce.number().int().min(1).max(20).default(1),
});
export type SearchFlightsQuery = z.infer<typeof SearchFlightsQuery>;

export const ListFlightsQuery = z.object({
  routeId: Id.optional(),
  status: FlightStatus.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type ListFlightsQuery = z.infer<typeof ListFlightsQuery>;

/** Returns ISO dates (YYYY-MM-DD[]) that have at least one available seat for a route window. */
export const AvailableDatesQuery = z.object({
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  from: z.string().date(),
  to: z.string().date(),
});
export type AvailableDatesQuery = z.infer<typeof AvailableDatesQuery>;
