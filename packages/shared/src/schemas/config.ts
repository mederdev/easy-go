import { z } from 'zod';
import { CurrencyCode } from '../enums.js';

/** Singleton system settings. Currency here applies across the whole system. */
export const SystemConfig = z.object({
  currency: CurrencyCode,
  companyName: z.string(),
  whatsappPhone: z.string(), // E.164 digits, for wa.me links
  locale: z.string(),
  /** Telegram group chat that receives booking notifications. */
  telegramNotifyChatId: z.string().nullable(),
  /** Default price of a pickup/dropoff point inside the city (minor units, guideline only). */
  stopPriceCity: z.number().int().nonnegative(),
  /** Default price of a pickup/dropoff point outside the city (minor units, guideline only). */
  stopPriceOutside: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});
export type SystemConfig = z.infer<typeof SystemConfig>;

export const UpdateSystemConfigInput = z.object({
  currency: CurrencyCode.optional(),
  companyName: z.string().min(1).optional(),
  whatsappPhone: z.string().min(6).optional(),
  locale: z.string().min(2).optional(),
  /** Nullable so the admin can clear the notification chat. */
  telegramNotifyChatId: z.string().nullable().optional(),
  stopPriceCity: z.number().int().nonnegative().optional(),
  stopPriceOutside: z.number().int().nonnegative().optional(),
});
export type UpdateSystemConfigInput = z.infer<typeof UpdateSystemConfigInput>;
