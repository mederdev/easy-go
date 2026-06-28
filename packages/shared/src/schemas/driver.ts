import { z } from 'zod';
import { Id, Phone } from './common.js';
import { FlightStatus } from '../enums.js';

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

export const DriverProfile = z.object({
  id: Id,
  name: z.string(),
  phone: z.string(),
  experience: z.string().nullable(),
});
export type DriverProfile = z.infer<typeof DriverProfile>;

export const DriverAuthResponse = z.object({
  token: z.string(),
  driver: DriverProfile,
});
export type DriverAuthResponse = z.infer<typeof DriverAuthResponse>;

/** Passenger info visible to driver — name only, no phone. */
export const DriverFlightPassenger = z.object({
  name: z.string(),
  pax: z.number().int(),
});
export type DriverFlightPassenger = z.infer<typeof DriverFlightPassenger>;

export const DriverFlightView = z.object({
  id: Id,
  departAt: z.string().datetime(),
  status: FlightStatus,
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
