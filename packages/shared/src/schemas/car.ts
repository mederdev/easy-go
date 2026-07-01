import { z } from 'zod';
import { Id } from './common.js';
import { CarStatus, CarType } from '../enums.js';
import { Driver } from './driver.js';

export const Car = z.object({
  id: Id,
  model: z.string().min(1), // "KIA Carnival"
  plate: z.string().min(1),
  type: CarType,
  driverId: Id.nullable(),
  driver: Driver.nullable().optional(),
  seats: z.number().int().positive(),
  status: CarStatus,
  locationCity: z.string().nullable(), // "Бишкек"
  currentLat: z.number().nullable(),
  currentLng: z.number().nullable(),
  tripsMonth: z.number().int().nonnegative(), // denormalized
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Car = z.infer<typeof Car>;

export const CreateCarInput = z.object({
  model: z.string().min(1),
  plate: z.string().min(1),
  type: CarType.default('MINIVAN'),
  driverId: Id.nullish(),
  seats: z.number().int().positive().default(11),
  status: CarStatus.default('AVAILABLE'),
  locationCity: z.string().nullish(),
});
export type CreateCarInput = z.infer<typeof CreateCarInput>;

export const UpdateCarInput = CreateCarInput.partial();
export type UpdateCarInput = z.infer<typeof UpdateCarInput>;

export const UpdateCarLocationInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationCity: z.string().optional(),
});
export type UpdateCarLocationInput = z.infer<typeof UpdateCarLocationInput>;

export const ListCarsQuery = z.object({
  status: CarStatus.optional(),
});
export type ListCarsQuery = z.infer<typeof ListCarsQuery>;
