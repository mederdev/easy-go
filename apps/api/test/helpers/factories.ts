import bcrypt from 'bcryptjs';
import type {
  BookingStatus,
  CarStatus,
  CarType,
  FlightStatus,
  PaymentStatus,
  RouteStatus,
  UserRole,
} from '@easygo/shared';
import { prisma } from './db.js';
import { userToken, clientToken, driverToken, bearer } from './app.js';

// Unique phone/plate generators — monotonic across the whole run so fixtures
// never collide on @unique columns within a single test.
let seq = 0;
const next = () => ++seq;
export function uniquePhone(prefix = '+99670'): string {
  return `${prefix}${String(1_000_000 + next())}`;
}
export function uniquePlate(): string {
  return `01KG${String(100 + next())}AA`;
}

// ── Identities (create row + ready-to-use auth headers) ──

export async function makeUser(
  opts: { role?: UserRole; name?: string; phone?: string; password?: string } = {},
) {
  const role = opts.role ?? 'owner';
  const phone = opts.phone ?? uniquePhone();
  const passwordHash = await bcrypt.hash(opts.password ?? 'secret123', 10);
  const user = await prisma.user.create({
    data: { name: opts.name ?? `User ${role}`, phone, role, passwordHash },
  });
  const token = await userToken(user.id, role, user.name);
  return { user, token, headers: bearer(token) };
}

export async function makeClientRow(
  opts: { name?: string; phone?: string | null; whatsapp?: boolean; password?: string } = {},
) {
  const phone = opts.phone === undefined ? uniquePhone() : opts.phone;
  const client = await prisma.client.create({
    data: {
      name: opts.name ?? 'Клиент Тест',
      phone,
      whatsapp: opts.whatsapp ?? true,
      ...(opts.password ? { passwordHash: await bcrypt.hash(opts.password, 10) } : {}),
    },
  });
  const token = await clientToken(client.id, client.name);
  return { client, token, headers: bearer(token) };
}

export async function makeDriver(
  opts: { name?: string; phone?: string; experience?: string; isActive?: boolean; password?: string; withCar?: boolean | Partial<{ seats: number; status: CarStatus; type: CarType }> } = {},
) {
  const driver = await prisma.driver.create({
    data: {
      name: opts.name ?? 'Водитель Тест',
      phone: opts.phone ?? uniquePhone(),
      experience: opts.experience ?? '5 лет',
      isActive: opts.isActive ?? true,
      ...(opts.password ? { passwordHash: await bcrypt.hash(opts.password, 10) } : {}),
    },
  });
  let car: Awaited<ReturnType<typeof prisma.car.create>> | undefined;
  if (opts.withCar) {
    const carOpts = typeof opts.withCar === 'object' ? opts.withCar : {};
    car = await makeCar({ driverId: driver.id, ...carOpts });
  }
  const token = await driverToken(driver.id, driver.name);
  return { driver, car, token, headers: bearer(token) };
}

// ── Domain fixtures ──

export async function makeCar(
  opts: { model?: string; plate?: string; type?: CarType; driverId?: string | null; seats?: number; status?: CarStatus; locationCity?: string | null } = {},
) {
  return prisma.car.create({
    data: {
      model: opts.model ?? 'KIA Carnival',
      plate: opts.plate ?? uniquePlate(),
      type: opts.type ?? 'MINIVAN',
      driverId: opts.driverId ?? null,
      seats: opts.seats ?? 11,
      status: opts.status ?? 'AVAILABLE',
      locationCity: opts.locationCity ?? null,
    },
  });
}

export async function makeRoute(
  opts: { fromCity?: string; toCity?: string; durationLabel?: string; price?: number; dailyTrips?: number; status?: RouteStatus } = {},
) {
  return prisma.route.create({
    data: {
      // Default to a UNIQUE city pair so multiple routes in one test don't
      // collide on @@unique([fromCity, toCity]). Tests that need specific
      // cities pass them explicitly.
      fromCity: opts.fromCity ?? 'Бишкек',
      toCity: opts.toCity ?? `Пункт-${next()}`,
      durationLabel: opts.durationLabel ?? '4 часа',
      price: opts.price ?? 350_000, // 3500 сом in minor units
      dailyTrips: opts.dailyTrips ?? 3,
      status: opts.status ?? 'ACTIVE',
    },
  });
}

/** Hours from now → Date (positive = future departure). */
export function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 3_600_000);
}

export async function makeFlight(
  opts: { routeId?: string; carId?: string | null; departAt?: Date; seatsTotal?: number; seatsTaken?: number; status?: FlightStatus; paymentStatus?: PaymentStatus; pickupAddress?: string | null } = {},
) {
  let routeId = opts.routeId;
  if (!routeId) routeId = (await makeRoute()).id;
  return prisma.flight.create({
    data: {
      routeId,
      carId: opts.carId ?? null,
      departAt: opts.departAt ?? hoursFromNow(24),
      seatsTotal: opts.seatsTotal ?? 11,
      seatsTaken: opts.seatsTaken ?? 0,
      status: opts.status ?? 'SCHEDULED',
      paymentStatus: opts.paymentStatus ?? 'UNPAID',
      pickupAddress: opts.pickupAddress ?? null,
    },
    include: { route: true, car: true },
  });
}

/**
 * Directly insert a booking row (bypassing the service) — for arranging state
 * in tests that exercise other flows. For counter-accurate bookings, go through
 * the API instead.
 */
export async function makeBookingRow(
  opts: { clientId: string; flightId: string; pax?: number; total?: number; discount?: number; prepaid?: number; status?: BookingStatus; paymentStatus?: PaymentStatus; code?: string },
) {
  return prisma.booking.create({
    data: {
      code: opts.code ?? `№${1000 + next()}`,
      clientId: opts.clientId,
      flightId: opts.flightId,
      pax: opts.pax ?? 1,
      total: opts.total ?? 350_000,
      discount: opts.discount ?? 0,
      prepaid: opts.prepaid ?? 0,
      status: opts.status ?? 'NEW',
      paymentStatus: opts.paymentStatus ?? 'UNPAID',
    },
  });
}
