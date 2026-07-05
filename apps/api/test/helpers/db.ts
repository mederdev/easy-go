import { prisma } from '../../src/lib/prisma.js';

export { prisma };

// Every table except Prisma's internal _prisma_migrations. Order is irrelevant
// under CASCADE. RESTART IDENTITY resets Booking.seq so booking codes are
// deterministic (first booking → №1001) inside each test.
const TABLES = [
  'Booking',
  'DailyStat',
  'IdempotencyKey',
  'Flight',
  'Car',
  'Route',
  'Client',
  'Driver',
  'DriverApplication',
  'PartnerApplication',
  'CustomRequest',
  'FileObject',
  'User',
  'SystemConfig',
];

const TRUNCATE = `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;

/** Wipe every domain table back to empty. Called before each test. */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(TRUNCATE);
}
