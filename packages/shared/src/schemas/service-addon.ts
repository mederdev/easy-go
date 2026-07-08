import { z } from 'zod';
import { Id } from './common.js';
import { AddonStatus } from '../enums.js';

/**
 * Paid extra services (доп. услуги). Kept in their own module so `booking` can
 * import the per-booking line type without pulling in unrelated schemas.
 *
 * Two shapes:
 *  - `ServiceAddon` — a reusable catalog entry an admin manages (name + default
 *    price). Soft-deleted via `ARCHIVED`.
 *  - `BookingAddon` — a service attached to one booking. `name`/`price` are
 *    snapshots taken at attach time (the catalog row only prefills them), and
 *    the price is included in `booking.total`.
 */

// ── Catalog ──

export const ServiceAddon = z.object({
  id: Id,
  name: z.string(),
  price: z.number().int().nonnegative(), // default price, minor units
  status: AddonStatus,
  order: z.number().int(),
});
export type ServiceAddon = z.infer<typeof ServiceAddon>;

export const CreateServiceAddonInput = z.object({
  name: z.string().min(1).max(120),
  price: z.number().int().nonnegative().default(0), // minor units
  order: z.number().int().optional(),
});
export type CreateServiceAddonInput = z.infer<typeof CreateServiceAddonInput>;

export const UpdateServiceAddonInput = z
  .object({
    name: z.string().min(1).max(120).optional(),
    price: z.number().int().nonnegative().optional(),
    order: z.number().int().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Нет изменений для сохранения',
  });
export type UpdateServiceAddonInput = z.infer<typeof UpdateServiceAddonInput>;

// ── Per-booking line ──

export const BookingAddon = z.object({
  id: Id,
  addonId: Id.nullable(), // catalog link; null if the catalog row was removed
  name: z.string(),
  price: z.number().int().nonnegative(), // minor units; part of booking.total
  order: z.number().int(),
});
export type BookingAddon = z.infer<typeof BookingAddon>;

/**
 * Attach a service to a booking. Pass `addonId` to snapshot a catalog entry's
 * name+price; `name`/`price` override the snapshot (or stand alone for an ad-hoc
 * service). At least one of `addonId`/`name` must be present.
 */
export const AddBookingAddonInput = z
  .object({
    addonId: Id.optional(),
    name: z.string().min(1).max(120).optional(),
    price: z.number().int().nonnegative().optional(), // minor units
  })
  .refine((v) => v.addonId !== undefined || v.name !== undefined, {
    message: 'Укажите услугу',
  });
export type AddBookingAddonInput = z.infer<typeof AddBookingAddonInput>;

export const UpdateBookingAddonInput = z
  .object({
    name: z.string().min(1).max(120).optional(),
    price: z.number().int().nonnegative().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Нет изменений для сохранения',
  });
export type UpdateBookingAddonInput = z.infer<typeof UpdateBookingAddonInput>;
