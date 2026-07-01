/** Cities served, used for route from/to selectors. */
export const CITIES = ['Бишкек', 'Алматы', 'Иссык-Куль', 'Каракол'] as const;
export type City = (typeof CITIES)[number];

/** A flight with this fraction (or fewer) of seats left is shown as "few seats". */
export const FEW_SEATS_RATIO = 0.2;

export const DEFAULT_CURRENCY = 'KGS' as const;
export const DEFAULT_LOCALE = 'ru-RU' as const;

export const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Allowed seat counts per vehicle class. Sedan and bus are fixed; a minivan
 * can be 5, 6 or 7 seats (chosen individually). First value is the default.
 */
export const CAR_TYPE_SEAT_OPTIONS = {
  SEDAN: [4],
  MINIVAN: [5, 6, 7],
  BUS: [20],
} as const satisfies Record<'SEDAN' | 'MINIVAN' | 'BUS', readonly number[]>;

/** Default seat count for a vehicle class (first allowed option). */
export function carTypeSeats(type: 'SEDAN' | 'MINIVAN' | 'BUS'): number {
  return CAR_TYPE_SEAT_OPTIONS[type][0];
}

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;
