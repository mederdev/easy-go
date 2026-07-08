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

/**
 * Extra capabilities a car can have (e.g. a roof rack for oversized luggage).
 * A car lists what it offers; a custom request lists what the customer wants,
 * so an operator can pair the request with a suitable car. Stored as an array.
 */
export const CarFeature = z.enum(['ROOF_RACK', 'CHILD_SEAT', 'EXTRA_LUGGAGE', 'PET']);
export type CarFeature = z.infer<typeof CarFeature>;

/** Stored lifecycle. "few seats left" is derived, not stored. */
export const FlightStatus = z.enum(['SCHEDULED', 'CLOSED', 'DEPARTED', 'COMPLETED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY']);
export type FlightStatus = z.infer<typeof FlightStatus>;

/**
 * Kind of an extra pickup/dropoff point on a booking: PICKUP — the driver
 * collects the passenger there before departure, DROPOFF — drops them off
 * along/after the route.
 */
export const StopKind = z.enum(['PICKUP', 'DROPOFF']);
export type StopKind = z.infer<typeof StopKind>;

/** Lifecycle of a catalog service add-on (доп. услуга); archived = soft-deleted. */
export const AddonStatus = z.enum(['ACTIVE', 'ARCHIVED']);
export type AddonStatus = z.infer<typeof AddonStatus>;

/**
 * Payment state of a booking or a flight.
 * Booking: derived from `prepaid` vs `total` (UNPAID/PARTIAL/PAID), plus an
 * explicit "mark paid" action. Flight: aggregated from its active bookings.
 */
export const PaymentStatus = z.enum(['UNPAID', 'PARTIAL', 'PAID']);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const RouteStatus = z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']);
export type RouteStatus = z.infer<typeof RouteStatus>;

export const CarStatus = z.enum(['AVAILABLE', 'ON_TRIP', 'MAINTENANCE']);
export type CarStatus = z.infer<typeof CarStatus>;

/** Vehicle class. Drives seat capacity: sedan 4, minivan 5–7, bus 20. */
export const CarType = z.enum(['SEDAN', 'MINIVAN', 'BUS']);
export type CarType = z.infer<typeof CarType>;

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
