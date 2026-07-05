import bcrypt from 'bcryptjs';
import type { DriverLoginInput, DriverProfile } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';

/** Cars currently assigned to the driver, in a stable order for display. */
const carsInclude = {
  cars: {
    select: { id: true, model: true, plate: true, seats: true },
    orderBy: { plate: 'asc' },
  },
} as const;

type DriverWithCars = { id: string; name: string; phone: string; experience: string | null; cars: DriverProfile['cars'] };

function toDriverProfile(driver: DriverWithCars): DriverProfile {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    experience: driver.experience,
    cars: driver.cars,
  };
}

export async function loginDriver(input: DriverLoginInput): Promise<DriverProfile> {
  const phone = normalizePhone(input.phone);
  const driver = await prisma.driver.findUnique({ where: { phone }, include: carsInclude });
  if (!driver || !driver.passwordHash) throw Errors.unauthorized('Неверный телефон или пароль');

  const ok = await bcrypt.compare(input.password, driver.passwordHash);
  if (!ok) throw Errors.unauthorized('Неверный телефон или пароль');

  // A deactivated driver keeps their credentials but must not get a session.
  if (!driver.isActive) throw Errors.forbidden('Аккаунт водителя деактивирован');

  return toDriverProfile(driver);
}

export async function getDriverMe(driverId: string): Promise<DriverProfile> {
  const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: carsInclude });
  if (!driver) throw Errors.notFound('Водитель');
  return toDriverProfile(driver);
}
