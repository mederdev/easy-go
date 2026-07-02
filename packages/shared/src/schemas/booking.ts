import { z } from 'zod';
import { Id, Phone, PaginationQuery } from './common.js';
import { BookingStatus, PaymentStatus } from '../enums.js';
import { Client } from './client.js';
import { Flight } from './flight.js';

export const Booking = z.object({
  id: Id,
  code: z.string(), // human-facing "№1042"
  clientId: Id,
  client: Client.optional(),
  flightId: Id,
  flight: Flight.optional(),
  pax: z.number().int().positive(),
  discount: z.number().int().nonnegative(), // minor units, amount off
  prepaid: z.number().int().nonnegative(), // minor units, paid so far
  total: z.number().int().nonnegative(), // minor units = price * pax - discount
  status: BookingStatus,
  paymentStatus: PaymentStatus,
  comment: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Booking = z.infer<typeof Booking>;

/**
 * Public booking request from the client app. The client may be new (we upsert
 * by phone). Send an `Idempotency-Key` header to make retries safe.
 */
export const CreateBookingInput = z.object({
  flightId: Id,
  pax: z.number().int().min(1).max(20),
  name: z.string().min(1),
  phone: Phone,
  whatsapp: z.boolean().default(true),
  comment: z.string().max(1000).optional(),
});
export type CreateBookingInput = z.infer<typeof CreateBookingInput>;

/** Operator-side manual booking (admin CRM). Discount/prepayment are admin-only. */
export const AdminCreateBookingInput = CreateBookingInput.extend({
  status: BookingStatus.default('NEW'),
  discount: z.number().int().nonnegative().default(0), // minor units
  prepaid: z.number().int().nonnegative().default(0), // minor units
});
export type AdminCreateBookingInput = z.infer<typeof AdminCreateBookingInput>;

export const UpdateBookingStatusInput = z.object({
  status: BookingStatus,
});
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusInput>;

/** Admin-only edit of the money fields; total + paymentStatus recompute server-side. */
export const UpdateBookingPaymentInput = z
  .object({
    discount: z.number().int().nonnegative().optional(), // minor units
    prepaid: z.number().int().nonnegative().optional(), // minor units
  })
  .refine((v) => v.discount !== undefined || v.prepaid !== undefined, {
    message: 'Укажите скидку или предоплату',
  });
export type UpdateBookingPaymentInput = z.infer<typeof UpdateBookingPaymentInput>;

/** Explicit payment-status action (mark paid / clear). Shared by admin + driver. */
export const SetPaymentStatusInput = z.object({
  status: PaymentStatus,
});
export type SetPaymentStatusInput = z.infer<typeof SetPaymentStatusInput>;

export const ListBookingsQuery = PaginationQuery.extend({
  status: BookingStatus.optional(),
  clientId: Id.optional(),
  flightId: Id.optional(),
  search: z.string().trim().optional(),
  from: z.string().date().optional(), // filter by flight departure day, inclusive
  to: z.string().date().optional(),
});
export type ListBookingsQuery = z.infer<typeof ListBookingsQuery>;

/** Customer's own bookings (scoped to the authenticated client). */
export const MyBookingsQuery = PaginationQuery.extend({
  status: BookingStatus.optional(),
});
export type MyBookingsQuery = z.infer<typeof MyBookingsQuery>;
