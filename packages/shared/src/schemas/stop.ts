import { z } from 'zod';
import { Id } from './common.js';
import { StopKind } from '../enums.js';

/**
 * Pickup/dropoff points on a booking (точки сбора и развоза). Kept in their own
 * module — they depend only on `Id`/`StopKind`, so `booking`, `driver` and
 * `custom-request` can all import them without forming an import cycle
 * (driver → booking → flight → car → driver).
 */

/**
 * Extra pickup/dropoff point on a booking. Clients add/edit addresses; the
 * per-point price is set (confirmed) by an admin — `price === null` means
 * "ждёт подтверждения". Confirmed prices are included in `booking.total`.
 * `pickedUp` is the driver's "passenger collected" checkbox.
 */
export const BookingStop = z.object({
  id: Id,
  kind: StopKind,
  address: z.string(),
  note: z.string().nullable(),
  price: z.number().int().nonnegative().nullable(), // minor units; null = not confirmed yet
  pickedUp: z.boolean(),
  order: z.number().int(),
});
export type BookingStop = z.infer<typeof BookingStop>;

/** Client-side stop payload (create/edit). The price is admin-only. */
export const StopInput = z.object({
  kind: StopKind.default('PICKUP'),
  address: z.string().min(1).max(300),
  note: z.string().max(300).optional(),
});
export type StopInput = z.infer<typeof StopInput>;

/** Admin-side stop payload: same as the client's plus the per-point price. */
export const AdminStopInput = StopInput.extend({
  price: z.number().int().nonnegative().nullable().optional(), // minor units; null/omit = not confirmed
});
export type AdminStopInput = z.infer<typeof AdminStopInput>;

/**
 * Partial stop edit. Admin may set `price` (null clears the confirmation);
 * a client editing the `address` resets the price server-side — it must be
 * re-confirmed by an admin.
 */
export const UpdateStopInput = z
  .object({
    kind: StopKind.optional(),
    address: z.string().min(1).max(300).optional(),
    note: z.string().max(300).nullable().optional(),
    price: z.number().int().nonnegative().nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Нет изменений для сохранения' });
export type UpdateStopInput = z.infer<typeof UpdateStopInput>;
