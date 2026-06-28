import { z } from 'zod';

/**
 * Canonical enums. DB stores these UPPER_SNAKE values; the UI maps them to
 * Russian labels (see `labels.ts`). Keep values stable — they are persisted.
 */

export const UserRole = z.enum(['operator', 'admin', 'owner']);
export type UserRole = z.infer<typeof UserRole>;

/** New → Confirmed → Completed, or Cancelled at any point. */
export const BookingStatus = z.enum(['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY']);
export type BookingStatus = z.infer<typeof BookingStatus>;

/** Stored lifecycle. "few seats left" is derived, not stored. */
export const FlightStatus = z.enum(['SCHEDULED', 'CLOSED', 'DEPARTED', 'COMPLETED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY']);
export type FlightStatus = z.infer<typeof FlightStatus>;

export const RouteStatus = z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']);
export type RouteStatus = z.infer<typeof RouteStatus>;

export const CarStatus = z.enum(['AVAILABLE', 'ON_TRIP', 'MAINTENANCE']);
export type CarStatus = z.infer<typeof CarStatus>;

export const ApplicationStatus = z.enum(['NEW', 'REVIEWING', 'ACCEPTED', 'REJECTED']);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

/** Polymorphic owner of an uploaded file. */
export const FileOwnerType = z.enum(['CAR', 'COMPANY', 'DRIVER_APPLICATION', 'PARTNER_APPLICATION']);
export type FileOwnerType = z.infer<typeof FileOwnerType>;

export const FileKind = z.enum(['CAR_PHOTO', 'COMPANY_PHOTO', 'LICENSE', 'ATTACHMENT']);
export type FileKind = z.infer<typeof FileKind>;

/** ISO-4217 codes we support. Default currency lives in SystemConfig. */
export const CurrencyCode = z.enum(['KGS', 'KZT', 'USD', 'RUB']);
export type CurrencyCode = z.infer<typeof CurrencyCode>;
