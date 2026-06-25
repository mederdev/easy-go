import bcrypt from 'bcryptjs';
import type { AuthUser, LoginInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { Errors } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';

export async function login(input: LoginInput): Promise<AuthUser> {
  const phone = normalizePhone(input.phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw Errors.unauthorized('Неверный телефон или пароль');

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw Errors.unauthorized('Неверный телефон или пароль');

  return { id: user.id, name: user.name, phone: user.phone, role: user.role };
}

export async function getMe(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.notFound('Пользователь');
  return { id: user.id, name: user.name, phone: user.phone, role: user.role };
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
