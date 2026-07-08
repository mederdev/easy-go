import { z } from 'zod';
import { Id, Phone, PaginationQuery } from './common.js';
import { BookingStatus, PaymentStatus } from '../enums.js';
import { Client } from './client.js';
import { Flight } from './flight.js';
import { AdminStopInput, BookingStop, StopInput } from './stop.js';
import { BookingAddon } from './service-addon.js';

export const Booking = z.object({
  id: Id,
  code: z.string(), // human-facing "№1042"
  clientId: Id,
  client: Client.optional(),
  flightId: Id,
  flight: Flight.optional(),
  pax: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative().nullable(), // minor units, per-seat price override; null = route.price
  discount: z.number().int().nonnegative(), // minor units, amount off
  prepaid: z.number().int().nonnegative(), // minor units, paid so far
  total: z.number().int().nonnegative(), // minor units = (unitPrice ?? route.price) * pax - discount
  status: BookingStatus,
  paymentStatus: PaymentStatus,
  comment: z.string().nullable(),
  stops: BookingStop.array().optional(),
  addons: BookingAddon.array().optional(),
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
  // Extra pickup/dropoff points, at most one of each type per passenger
  // (enforced server-side). Priced per point by an admin after contact.
  stops: StopInput.array().max(40).default([]),
});
export type CreateBookingInput = z.infer<typeof CreateBookingInput>;

/** Operator-side manual booking (admin CRM). Discount/prepayment are admin-only. */
export const AdminCreateBookingInput = CreateBookingInput.extend({
  status: BookingStatus.default('NEW'),
  stops: AdminStopInput.array().max(40).default([]), // admin may price points immediately
  unitPrice: z.number().int().nonnegative().optional(), // minor units, per-seat override; omit to use route.price
  discount: z.number().int().nonnegative().default(0), // minor units
  prepaid: z.number().int().nonnegative().default(0), // minor units
});
export type AdminCreateBookingInput = z.infer<typeof AdminCreateBookingInput>;

export const UpdateBookingStatusInput = z.object({
  status: BookingStatus,
});
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusInput>;

/**
 * Admin-only edit of a booking's mutable fields (passengers, per-seat price,
 * discount, prepayment, comment). `total`, `paymentStatus` and the flight's seat
 * counters recompute server-side. Departure time lives on the flight and is
 * edited via the flights endpoint, not here.
 */
export const UpdateBookingPaymentInput = z
  .object({
    flightId: Id.optional(), // reassign the booking to a different flight
    pax: z.number().int().min(1).max(20).optional(),
    unitPrice: z.number().int().nonnegative().nullable().optional(), // minor units; null resets to route.price
    discount: z.number().int().nonnegative().optional(), // minor units
    prepaid: z.number().int().nonnegative().optional(), // minor units
    comment: z.string().max(1000).nullable().optional(),
  })
  .refine(
    (v) =>
      v.flightId !== undefined ||
      v.pax !== undefined ||
      v.unitPrice !== undefined ||
      v.discount !== undefined ||
      v.prepaid !== undefined ||
      v.comment !== undefined,
    { message: 'Нет изменений для сохранения' },
  );
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
