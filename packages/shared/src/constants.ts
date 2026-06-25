/** Cities served, used for route from/to selectors. */
export const CITIES = ['Бишкек', 'Алматы', 'Иссык-Куль', 'Каракол'] as const;
export type City = (typeof CITIES)[number];

/** A flight with this fraction (or fewer) of seats left is shown as "few seats". */
export const FEW_SEATS_RATIO = 0.2;

export const DEFAULT_CURRENCY = 'KGS' as const;
export const DEFAULT_LOCALE = 'ru-RU' as const;

export const IDEMPOTENCY_HEADER = 'idempotency-key';

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
} as const;
