import { z } from 'zod';
import { Phone } from './common.js';
import { ApplicationStatus } from '../enums.js';

export const CustomRequest = z.object({
  id: z.string().uuid(),
  fromCity: z.string(),
  toCity: z.string(),
  date: z.string(),
  pax: z.number().int(),
  phone: z.string(),
  comment: z.string().nullable(),
  status: ApplicationStatus,
  createdAt: z.string().datetime(),
});
export type CustomRequest = z.infer<typeof CustomRequest>;

export const CreateCustomRequestInput = z.object({
  fromCity: z.string().min(1),
  toCity: z.string().min(1),
  date: z.string().date(),
  pax: z.coerce.number().int().min(1).max(20),
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
