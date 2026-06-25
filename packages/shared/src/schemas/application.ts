import { z } from 'zod';
import { Id, Phone, PaginationQuery } from './common.js';
import { ApplicationStatus } from '../enums.js';

export const DriverApplication = z.object({
  id: Id,
  name: z.string().min(1),
  phone: z.string(),
  hasCar: z.boolean(),
  carInfo: z.string().nullable(),
  experience: z.string().nullable(),
  directions: z.string().nullable(), // "Бишкек — Алматы"
  about: z.string().nullable(),
  status: ApplicationStatus,
  createdAt: z.string().datetime(),
});
export type DriverApplication = z.infer<typeof DriverApplication>;

export const CreateDriverApplicationInput = z.object({
  name: z.string().min(1),
  phone: Phone,
  hasCar: z.boolean().default(false),
  carInfo: z.string().optional(),
  experience: z.string().optional(),
  directions: z.string().optional(),
  about: z.string().max(2000).optional(),
});
export type CreateDriverApplicationInput = z.infer<typeof CreateDriverApplicationInput>;

export const PartnerApplication = z.object({
  id: Id,
  company: z.string().min(1),
  sphere: z.string().nullable(),
  contacts: z.string(),
  proposal: z.string().nullable(),
  status: ApplicationStatus,
  createdAt: z.string().datetime(),
});
export type PartnerApplication = z.infer<typeof PartnerApplication>;

export const CreatePartnerApplicationInput = z.object({
  company: z.string().min(1),
  sphere: z.string().optional(),
  contacts: z.string().min(1),
  proposal: z.string().max(2000).optional(),
});
export type CreatePartnerApplicationInput = z.infer<typeof CreatePartnerApplicationInput>;

export const UpdateApplicationStatusInput = z.object({
  status: ApplicationStatus,
});
export type UpdateApplicationStatusInput = z.infer<typeof UpdateApplicationStatusInput>;

export const ListApplicationsQuery = PaginationQuery.extend({
  status: ApplicationStatus.optional(),
});
export type ListApplicationsQuery = z.infer<typeof ListApplicationsQuery>;
