import { z } from 'zod';
import { Phone } from './common.js';
import { ApplicationStatus, CarType, CarFeature } from '../enums.js';
import { StopInput } from './stop.js';

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
  // Desired pickup/dropoff points; priced later when the booking is created.
  stops: StopInput.array().catch([]),
  phone: z.string(),
  comment: z.string().nullable(),
  status: ApplicationStatus,
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

export const ListCustomRequestsQuery = z.object({
  status: ApplicationStatus.optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});
export type ListCustomRequestsQuery = z.infer<typeof ListCustomRequestsQuery>;
