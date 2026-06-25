import { z } from 'zod';
import { Id, Phone, PaginationQuery } from './common.js';
import { BookingStatus } from '../enums.js';
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
  total: z.number().int().nonnegative(), // minor units (price * pax at booking time)
  status: BookingStatus,
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

/** Operator-side manual booking (admin CRM). */
export const AdminCreateBookingInput = CreateBookingInput.extend({
  status: BookingStatus.default('NEW'),
});
export type AdminCreateBookingInput = z.infer<typeof AdminCreateBookingInput>;

export const UpdateBookingStatusInput = z.object({
  status: BookingStatus,
});
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusInput>;

export const ListBookingsQuery = PaginationQuery.extend({
  status: BookingStatus.optional(),
  clientId: Id.optional(),
  flightId: Id.optional(),
  search: z.string().trim().optional(),
});
export type ListBookingsQuery = z.infer<typeof ListBookingsQuery>;

/** Customer's own bookings (scoped to the authenticated client). */
export const MyBookingsQuery = PaginationQuery.extend({
  status: BookingStatus.optional(),
});
export type MyBookingsQuery = z.infer<typeof MyBookingsQuery>;
