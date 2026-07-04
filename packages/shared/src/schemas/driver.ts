import { z } from 'zod';
import { Id, Phone } from './common.js';
import { FlightStatus, PaymentStatus } from '../enums.js';
import { BookingStop } from './stop.js';

export const Driver = z.object({
  id: Id,
  name: z.string().min(1),
  phone: z.string(),
  experience: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
});
export type Driver = z.infer<typeof Driver>;

export const CreateDriverInput = z.object({
  name: z.string().min(1),
  phone: Phone,
  experience: z.string().optional(),
});
export type CreateDriverInput = z.infer<typeof CreateDriverInput>;

export const UpdateDriverInput = CreateDriverInput.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateDriverInput = z.infer<typeof UpdateDriverInput>;

export const SetDriverPasswordInput = z.object({
  password: z.string().min(6).max(100),
});
export type SetDriverPasswordInput = z.infer<typeof SetDriverPasswordInput>;

export const DriverLoginInput = z.object({
  phone: Phone,
  password: z.string().min(6).max(100),
});
export type DriverLoginInput = z.infer<typeof DriverLoginInput>;

/** A car assigned to the driver (visible in the driver's cabinet). */
export const DriverCar = z.object({
  id: Id,
  model: z.string(),
  plate: z.string(),
  seats: z.number().int(),
});
export type DriverCar = z.infer<typeof DriverCar>;

export const DriverProfile = z.object({
  id: Id,
  name: z.string(),
  phone: z.string(),
  experience: z.string().nullable(),
  cars: z.array(DriverCar),
});
export type DriverProfile = z.infer<typeof DriverProfile>;

export const DriverAuthResponse = z.object({
  token: z.string(),
  driver: DriverProfile,
});
export type DriverAuthResponse = z.infer<typeof DriverAuthResponse>;

/**
 * Passenger info visible to driver — name, contact phone and payment info so the
 * driver can reach each passenger. Money fields are read-only for the driver
 * (admin-only to edit).
 */
export const DriverFlightPassenger = z.object({
  bookingId: Id,
  name: z.string(),
  phone: z.string(), // contact number for call / WhatsApp
  whatsapp: z.boolean(), // passenger reachable on WhatsApp
  pax: z.number().int(),
  total: z.number().int(), // minor units, amount due
  prepaid: z.number().int(), // minor units, paid so far
  discount: z.number().int(), // minor units
  paymentStatus: PaymentStatus,
  /** Where to collect/drop this passenger; the driver checks off each point. */
  stops: BookingStop.array(),
});
export type DriverFlightPassenger = z.infer<typeof DriverFlightPassenger>;

export const DriverFlightView = z.object({
  id: Id,
  departAt: z.string().datetime(),
  status: FlightStatus,
  paymentStatus: PaymentStatus,
  seatsTotal: z.number().int(),
  seatsTaken: z.number().int(),
  pickupAddress: z.string().nullable(),
  route: z.object({
    fromCity: z.string(),
    toCity: z.string(),
    durationLabel: z.string(),
  }),
  car: z.object({
    model: z.string(),
    plate: z.string(),
  }).nullable(),
  passengers: z.array(DriverFlightPassenger),
});
export type DriverFlightView = z.infer<typeof DriverFlightView>;

export const DriverSetFlightStatusInput = z.object({
  status: z.enum(['DEPARTED', 'COMPLETED']),
});
export type DriverSetFlightStatusInput = z.infer<typeof DriverSetFlightStatusInput>;

/** Driver sets the payment status of one booking on their flight. */
export const DriverSetBookingPaymentInput = z.object({
  status: PaymentStatus,
});
export type DriverSetBookingPaymentInput = z.infer<typeof DriverSetBookingPaymentInput>;

/** Driver marks the whole flight paid (or clears it). */
export const DriverSetFlightPaymentInput = z.object({
  status: PaymentStatus,
});
export type DriverSetFlightPaymentInput = z.infer<typeof DriverSetFlightPaymentInput>;

/** Driver ticks/unticks "collected the passenger at this stop". */
export const DriverSetStopPickedInput = z.object({
  pickedUp: z.boolean(),
});
export type DriverSetStopPickedInput = z.infer<typeof DriverSetStopPickedInput>;
