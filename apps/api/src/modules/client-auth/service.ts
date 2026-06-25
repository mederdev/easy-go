import type { OtpVerifyInput } from '@easygo/shared';
import { prisma } from '../../lib/prisma.js';
import { normalizePhone } from '../../lib/phone.js';
import { issueOtp, verifyOtp } from '../../lib/otp.js';
import { isProd } from '../../env.js';

/** Issue + send an OTP. Returns the code in dev so the UI can auto-fill it. */
export async function requestOtp(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  const { code, expiresIn } = await issueOtp(phone);
  return { ok: true as const, expiresIn, ...(isProd ? {} : { devCode: code }) };
}

/** Verify the code and upsert the customer by phone (creating on first login). */
export async function verifyAndUpsertClient(input: OtpVerifyInput) {
  const phone = normalizePhone(input.phone);
  await verifyOtp(phone, input.code);
  return prisma.client.upsert({
    where: { phone },
    create: { phone, name: input.name?.trim() || 'Клиент', whatsapp: true },
    update: input.name ? { name: input.name.trim() } : {},
  });
}
