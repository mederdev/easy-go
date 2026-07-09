/**
 * PROD seed — wipes ALL existing data and creates the back-office admins.
 *
 * ⚠️  DESTRUCTIVE. This deletes every booking, client, driver, car, route,
 *     flight, application, file record and user in the target database, then
 *     recreates only the admin accounts below. System config (currency,
 *     company name, WhatsApp/Telegram settings) is PRESERVED if it exists.
 *
 * On PROD (docker-compose) — the script is baked into the api image, so run it
 * as a one-shot via the existing `migrate` service (no compose edit needed):
 *     docker compose --env-file .env.prod -f docker-compose.prod.yml pull migrate
 *     docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm \
 *       migrate pnpm exec tsx prisma/seed-prod.ts --force
 *
 * Locally (with DATABASE_URL pointing at the target DB):
 *     pnpm --filter @easygo/api exec tsx prisma/seed-prod.ts --force
 *
 * The `--force` flag (or WIPE_CONFIRM=1) is required so it can't be run by
 * accident. Re-running is safe: admins are upserted by phone.
 */
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

loadEnv({ path: ['../../.env', '.env'] });

// ── Edit here ──────────────────────────────────────────────────────────────
// Shared login password for all admins below. Change before running if needed;
// they can also be reset per-user later from the CRM.
const PASSWORD = 'easygo123';

// Phones are stored as "+<digits>" (login normalizes input the same way).
const ADMINS = [
  { name: 'Арафат', phone: '+996708157666', role: 'admin' as const },
  { name: 'Акрам', phone: '+996558830003', role: 'admin' as const },
  { name: 'Корпоративный', phone: '+996708330003', role: 'admin' as const },
];
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

function targetHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(unknown)';
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

async function main() {
  const confirmed = process.argv.includes('--force') || process.env.WIPE_CONFIRM === '1';
  if (!confirmed) {
    console.error(
      `\n⛔ Refusing to wipe ${targetHost()} without confirmation.\n` +
        `   Re-run with --force (or WIPE_CONFIRM=1) once you're sure.\n`,
    );
    process.exit(1);
  }

  console.log(`\n🧨 Wiping ALL data on: ${targetHost()}`);

  // Delete children-first to satisfy Restrict FKs
  // (Booking ← Client/Flight, Flight ← Route, Car ← Driver).
  await prisma.bookingStop.deleteMany();
  await prisma.bookingAddon.deleteMany();
  await prisma.dailyStat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.serviceAddon.deleteMany();
  await prisma.car.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.route.deleteMany();
  await prisma.client.deleteMany();
  await prisma.fileObject.deleteMany();
  await prisma.customRequest.deleteMany();
  await prisma.driverApplication.deleteMany();
  await prisma.partnerApplication.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.user.deleteMany();

  // Keep existing SystemConfig (currency, company, WhatsApp/Telegram); only
  // create the singleton with defaults if it's missing.
  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', currency: 'KGS', companyName: 'EasyGo', locale: 'ru-RU' },
    update: {},
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const a of ADMINS) {
    await prisma.user.upsert({
      where: { phone: a.phone },
      create: { name: a.name, phone: a.phone, role: a.role, passwordHash },
      update: { name: a.name, role: a.role, passwordHash },
    });
    console.log(`  ✅ ${a.role.padEnd(8)} ${a.phone}  ${a.name}`);
  }

  console.log(`\n✅ Done. ${ADMINS.length} admins created. Password for all: "${PASSWORD}"\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
