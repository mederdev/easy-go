import { formatMoney } from '@easygo/shared';

/** Format integer minor units using the global currency/locale. */
export function money(minor: number): string {
  return formatMoney(minor);
}

/** "14:00" — ru-RU 24-hour time from an ISO timestamp. */
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/** Up to two uppercase initials from a name, e.g. "Айгуль Сапарова" → "АС". */
export function initials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
}
