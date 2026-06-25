import type { z } from 'zod';
import { AppError } from './errors.js';

/** Parse with a zod schema, throwing a 422 AppError on failure. */
export function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError(422, 'VALIDATION', 'Ошибка валидации', result.error.flatten());
  }
  return result.data;
}
