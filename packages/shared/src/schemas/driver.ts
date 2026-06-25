import { z } from 'zod';
import { Id, Phone } from './common.js';

export const Driver = z.object({
  id: Id,
  name: z.string().min(1),
  phone: z.string(),
  experience: z.string().nullable(), // "5 лет"
  createdAt: z.string().datetime(),
});
export type Driver = z.infer<typeof Driver>;

export const CreateDriverInput = z.object({
  name: z.string().min(1),
  phone: Phone,
  experience: z.string().optional(),
});
export type CreateDriverInput = z.infer<typeof CreateDriverInput>;

export const UpdateDriverInput = CreateDriverInput.partial();
export type UpdateDriverInput = z.infer<typeof UpdateDriverInput>;
