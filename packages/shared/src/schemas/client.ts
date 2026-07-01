import { z } from 'zod';
import { Id, Phone, PaginationQuery } from './common.js';

export const Client = z.object({
  id: Id,
  name: z.string().min(1),
  // Nullable: customers who signed up via Telegram have no phone until they
  // provide one (e.g. at booking). Still unique when present.
  phone: z.string().nullable(),
  whatsapp: z.boolean(),
  // Present for customers who authenticated with the Telegram Login Widget.
  telegramId: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
  photoUrl: z.string().nullable().optional(),
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
