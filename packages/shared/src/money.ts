import type { CurrencyCode } from './enums.js';

/**
 * All monetary amounts are stored and transported as integer MINOR units
 * (e.g. tyiyn for KGS). Formatting/parsing happens at the edges only.
 */

const MINOR_PER_MAJOR: Record<CurrencyCode, number> = {
  KGS: 100,
  KZT: 100,
  USD: 100,
  RUB: 100,
};

const SYMBOL: Record<CurrencyCode, string> = {
  KGS: 'сом',
  KZT: '₸',
  USD: '$',
  RUB: '₽',
};

export function minorPerMajor(currency: CurrencyCode): number {
  return MINOR_PER_MAJOR[currency];
}

/** 350000 (minor) → "3 500 сом" for KGS. */
export function formatMoney(
  minor: number,
  currency: CurrencyCode = 'KGS',
  locale = 'ru-RU',
): string {
  const major = minor / minorPerMajor(currency);
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(major);
  return `${num} ${SYMBOL[currency]}`;
}

/** "3500" or 3500 (major) → 350000 (minor). */
export function toMinor(major: number | string, currency: CurrencyCode = 'KGS'): number {
  const n = typeof major === 'string' ? Number(major.replace(/[^\d.,-]/g, '').replace(',', '.')) : major;
  if (!Number.isFinite(n)) throw new Error(`Invalid money amount: ${major}`);
  return Math.round(n * minorPerMajor(currency));
}

export function toMajor(minor: number, currency: CurrencyCode = 'KGS'): number {
  return minor / minorPerMajor(currency);
}
