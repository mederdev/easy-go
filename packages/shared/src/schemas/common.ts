import { z } from 'zod';
import { PAGINATION } from '../constants.js';

export const Id = z.string().uuid();

/** Phone in loose international form, normalized to +<digits> elsewhere. */
export const Phone = z
  .string()
  .trim()
  .min(6)
  .max(20)
  .regex(/^\+?[\d\s()-]+$/, 'Некорректный номер телефона');

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
  offset: z.coerce.number().int().min(0).default(0),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  });
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Geo point used for pickup / live car location. */
export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;

export const ErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
