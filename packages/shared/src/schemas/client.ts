import { z } from 'zod';
import { Id, Phone, PaginationQuery } from './common.js';

export const Client = z.object({
  id: Id,
  name: z.string().min(1),
  phone: z.string(),
  whatsapp: z.boolean(),
  tripsCount: z.number().int().nonnegative(), // denormalized
  totalSum: z.number().int().nonnegative(), // denormalized, minor units
  createdAt: z.string().datetime(),
  lastBookingAt: z.string().datetime().nullable(),
});
export type Client = z.infer<typeof Client>;

export const CreateClientInput = z.object({
  name: z.string().min(1),
  phone: Phone,
  whatsapp: z.boolean().default(true),
});
export type CreateClientInput = z.infer<typeof CreateClientInput>;

export const UpdateClientInput = CreateClientInput.partial();
export type UpdateClientInput = z.infer<typeof UpdateClientInput>;

export const ListClientsQuery = PaginationQuery.extend({
  search: z.string().trim().optional(),
});
export type ListClientsQuery = z.infer<typeof ListClientsQuery>;
