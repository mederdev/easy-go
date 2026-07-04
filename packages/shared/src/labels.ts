import type {
  BookingStatus,
  CarFeature,
  FlightStatus,
  RouteStatus,
  CarStatus,
  CarType,
  ApplicationStatus,
  PaymentStatus,
  StopKind,
  UserRole,
} from './enums.js';

/** Russian display labels for canonical enum values (used by admin + client). */

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  NEW: 'Новая',
  CONFIRMED: 'Подтверждён',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
  CANCELLED_BY_CLIENT: 'Отменён клиентом',
  CANCELLED_BY_COMPANY: 'Отменён компанией',
};

export const CAR_FEATURE_LABEL: Record<CarFeature, string> = {
  ROOF_RACK: 'Багажник на крыше',
  CHILD_SEAT: 'Детское кресло',
  EXTRA_LUGGAGE: 'Доп. багаж',
  PET: 'Животное',
};

export const FLIGHT_STATUS_LABEL: Record<FlightStatus, string> = {
  SCHEDULED: 'Продажи открыты',
  CLOSED: 'Продажи закрыты',
  DEPARTED: 'В пути',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
  CANCELLED_BY_CLIENT: 'Отменён клиентом',
  CANCELLED_BY_COMPANY: 'Отменён компанией',
};

export const STOP_KIND_LABEL: Record<StopKind, string> = {
  PICKUP: 'Сбор',
  DROPOFF: 'Развоз',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'Не оплачено',
  PARTIAL: 'Частично',
  PAID: 'Оплачено',
};

export const ROUTE_STATUS_LABEL: Record<RouteStatus, string> = {
  ACTIVE: 'Активен',
  DRAFT: 'Черновик',
  ARCHIVED: 'В архиве',
};

export const CAR_STATUS_LABEL: Record<CarStatus, string> = {
  AVAILABLE: 'Свободен',
  ON_TRIP: 'В пути',
  MAINTENANCE: 'На обслуживании',
};

export const CAR_TYPE_LABEL: Record<CarType, string> = {
  SEDAN: 'Легковушка',
  MINIVAN: 'Минивэн',
  BUS: 'Бус',
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  NEW: 'Новая',
  REVIEWING: 'На рассмотрении',
  ACCEPTED: 'Принята',
  REJECTED: 'Отклонена',
};

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  operator: 'Оператор',
  admin: 'Администратор',
  owner: 'Владелец',
};

/** Pluralize Russian nouns for a count: (1,2,5) → "место","места","мест". */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function seatsLabel(n: number): string {
  return `${n} ${pluralRu(n, 'место', 'места', 'мест')}`;
}

export function paxLabel(n: number): string {
  return `${n} ${pluralRu(n, 'пассажир', 'пассажира', 'пассажиров')}`;
}
