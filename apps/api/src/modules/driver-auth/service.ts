import bcrypt from 'bcryptjs';
import type { DriverLoginInput, DriverProfile } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';

export async function loginDriver(input: DriverLoginInput): Promise<DriverProfile> {
  const phone = normalizePhone(input.phone);
  const driver = await prisma.driver.findUnique({ where: { phone } });
  if (!driver || !driver.passwordHash) throw Errors.unauthorized('Неверный телефон или пароль');

  const ok = await bcrypt.compare(input.password, driver.passwordHash);
  if (!ok) throw Errors.unauthorized('Неверный телефон или пароль');

  return { id: driver.id, name: driver.name, phone: driver.phone, experience: driver.experience };
}

export async function getDriverMe(driverId: string): Promise<DriverProfile> {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw Errors.notFound('Водитель');
  return { id: driver.id, name: driver.name, phone: driver.phone, experience: driver.experience };
}
