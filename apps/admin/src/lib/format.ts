import type { Booking, Flight, Route } from '@easygo/shared';

/** "Бишкек → Алматы" from a Route. */
export function routeLabel(route?: Route | null): string {
  if (!route) return '—';
  return `${route.fromCity} → ${route.toCity}`;
}

/** Two-letter Russian initials, e.g. "Айгуль Сапарова" → "АС". */
export function initials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return '—';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
}

/** "25.06 · 14:00" for a flight departure ISO string. */
export function dateTimeLabel(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month} · ${hh}:${mm}`;
}

/** "14:00" from an ISO string. */
export function timeLabel(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "25.06.2026" from an ISO string. */
export function dateLabel(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

/** Resolve the route label for a booking via its embedded flight. */
export function bookingRouteLabel(booking: Booking): string {
  return routeLabel(booking.flight?.route);
}

/** Resolve a flight's route label. */
export function flightRouteLabel(flight: Flight): string {
  return routeLabel(flight.route);
}

/** Today's date as YYYY-MM-DD (local). */
export function todayISODate(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** N days ago as YYYY-MM-DD (local). */
export function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
