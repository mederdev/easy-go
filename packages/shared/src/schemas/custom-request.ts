import { z } from 'zod';
import { Phone } from './common.js';
import { ApplicationStatus, CarType, CarFeature, PaymentStatus } from '../enums.js';
import { StopInput, AdminStopInput } from './stop.js';

/** A priced extra service on a custom request (snapshot of name + price). */
export const CustomRequestAddon = z.object({
  name: z.string().min(1),
  price: z.number().int().nonnegative(), // minor units
});
export type CustomRequestAddon = z.infer<typeof CustomRequestAddon>;

export const CustomRequest = z.object({
  id: z.string().uuid(),
  fromCity: z.string(),
  toCity: z.string(),
  date: z.string(),
  time: z.string().nullable(), // "HH:MM" desired departure time, null = no preference
  pax: z.number().int(),
  carType: CarType.nullable(),
  features: CarFeature.array(), // add-ons the customer wants (roof rack, child seat…)
  wholeCabin: z.boolean(),
  // Desired pickup/dropoff points; the per-point price is confirmed by an admin.
  stops: AdminStopInput.array().catch([]),
  phone: z.string(),
  comment: z.string().nullable(),
  status: ApplicationStatus,
  // Operator-side pricing (mirrors a booking). No route → unitPrice is set by hand.
  unitPrice: z.number().int().nullable().catch(null),
  discount: z.number().int().catch(0),
  prepaid: z.number().int().catch(0),
  total: z.number().int().catch(0),
  paymentStatus: PaymentStatus.catch('UNPAID'),
  addons: CustomRequestAddon.array().catch([]),
  createdAt: z.string().datetime(),
  // Name of the registered client whose phone matches this request, if any.
  clientName: z.string().nullable().optional(),
});
export type CustomRequest = z.infer<typeof CustomRequest>;

export const CreateCustomRequestInput = z.object({
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  date: z.string().date(),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Время в формате ЧЧ:ММ').optional(),
  pax: z.coerce.number().int().min(1).max(20),
  carType: CarType.optional(),
  features: CarFeature.array().default([]),
  wholeCabin: z.coerce.boolean().default(false),
  stops: StopInput.array().max(40).default([]),
  phone: Phone,
  comment: z.string().max(500).optional(),
});
export type CreateCustomRequestInput = z.infer<typeof CreateCustomRequestInput>;

/**
 * Admin-only edit of a custom request: its mutable trip fields plus full pricing
 * (per-seat price, discount, prepayment, priced points and extra services).
 * `total` and `paymentStatus` recompute server-side; pass `paymentStatus`
 * explicitly only for the "mark paid / clear" action.
 */
export const UpdateCustomRequestInput = z
  .object({
    date: z.string().date().optional(), // YYYY-MM-DD desired departure day
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Время в формате ЧЧ:ММ').nullable().optional(),
    pax: z.number().int().min(1).max(20).optional(),
    carType: CarType.nullable().optional(),
    features: CarFeature.array().optional(),
    wholeCabin: z.boolean().optional(),
    unitPrice: z.number().int().nonnegative().nullable().optional(), // minor units; null = not quoted
    discount: z.number().int().nonnegative().optional(), // minor units
    prepaid: z.number().int().nonnegative().optional(), // minor units
    comment: z.string().max(1000).nullable().optional(),
    stops: AdminStopInput.array().max(40).optional(),
    addons: CustomRequestAddon.array().max(40).optional(),
    paymentStatus: PaymentStatus.optional(), // explicit mark-paid override
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'Нет изменений для сохранения',
  });
export type UpdateCustomRequestInput = z.infer<typeof UpdateCustomRequestInput>;

export const ListCustomRequestsQuery = z.object({
  status: ApplicationStatus.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type ListCustomRequestsQuery = z.infer<typeof ListCustomRequestsQuery>;
