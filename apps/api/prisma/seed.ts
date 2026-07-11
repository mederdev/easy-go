import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

loadEnv({ path: ['../../.env', '.env'] });

const prisma = new PrismaClient();

/** Local-day Date at a given hour, offset by `dayOffset` days from today. */
function at(hour: number, minute = 0, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function dateOnly(dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function main() {
  console.log('🌱 Seeding EasyGo…');

  // Clean (dev only) in dependency order.
  await prisma.dailyStat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.serviceAddon.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.flight.deleteMany();
  await prisma.car.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.route.deleteMany();
  await prisma.client.deleteMany();
  await prisma.driverApplication.deleteMany();
  await prisma.partnerApplication.deleteMany();
  await prisma.user.deleteMany();

  // System config (singleton).
  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', currency: 'KGS', companyName: 'EasyGo', whatsappPhone: '996700123456', locale: 'ru-RU' },
    update: {},
  });

  // Back-office users (password: "easygo123").
  const pass = await bcrypt.hash('easygo123', 10);
  await prisma.user.createMany({
    data: [
      { name: 'Акрам', phone: '+996700000001', role: 'owner', passwordHash: pass },
      { name: 'Администратор', phone: '+996700000002', role: 'admin', passwordHash: pass },
      { name: 'Оператор', phone: '+996700000003', role: 'operator', passwordHash: pass },
    ],
  });

  // Drivers + fleet.
  const bakyt = await prisma.driver.create({ data: { name: 'Бакыт А.', phone: '+996700111001', experience: '7 лет' } });
  const erlan = await prisma.driver.create({ data: { name: 'Эрлан Т.', phone: '+996700111002', experience: '5 лет' } });
  const talant = await prisma.driver.create({ data: { name: 'Талант М.', phone: '+996700111003', experience: '4 года' } });

  const [car1, car2, car3] = await Promise.all([
    prisma.car.create({ data: { model: 'KIA Carnival', plate: '01 KG 777 ABC', type: 'MINIVAN', driverId: bakyt.id, seats: 7, status: 'AVAILABLE', locationCity: 'Бишкек' } }),
    prisma.car.create({ data: { model: 'KIA Carnival', plate: '01 KG 555 DEF', type: 'MINIVAN', driverId: erlan.id, seats: 6, status: 'AVAILABLE', locationCity: 'Алматы' } }),
    prisma.car.create({ data: { model: 'Toyota Camry', plate: '01 KG 333 GHI', type: 'SEDAN', driverId: talant.id, seats: 4, status: 'ON_TRIP', locationCity: 'Бишкек' } }),
  ]);
  await prisma.car.create({ data: { model: 'Yutong Bus', plate: '01 KG 111 JKL', type: 'BUS', seats: 20, status: 'MAINTENANCE', locationCity: 'Бишкек' } });

  // Reusable catalog of paid extra services (price in minor units — сом × 100).
  await prisma.serviceAddon.createMany({
    data: [
      { name: 'Детское кресло', price: 50000, order: 0 },
      { name: 'Встреча с табличкой', price: 30000, order: 1 },
      { name: 'Негабаритный багаж', price: 40000, order: 2 },
    ],
  });

  // Routes (price in minor units — сом × 100). cabinPrice* = default "весь салон"
  // price per car class, used to quote custom requests on an existing route.
  const rBA = await prisma.route.create({ data: { fromCity: 'Бишкек', toCity: 'Алматы', durationLabel: '~4 ч', price: 350000, cabinPriceSedan: 1200000, cabinPriceMinivan: 2000000, cabinPriceBus: 3500000, dailyTrips: 3, status: 'ACTIVE', popular: true } });
  const rAB = await prisma.route.create({ data: { fromCity: 'Алматы', toCity: 'Бишкек', durationLabel: '~4 ч', price: 350000, cabinPriceSedan: 1200000, cabinPriceMinivan: 2000000, cabinPriceBus: 3500000, dailyTrips: 3, status: 'ACTIVE', popular: true } });
  const rBI = await prisma.route.create({ data: { fromCity: 'Бишкек', toCity: 'Иссык-Куль', durationLabel: '~5 ч', price: 200000, cabinPriceSedan: 800000, cabinPriceMinivan: 1300000, cabinPriceBus: 2200000, dailyTrips: 2, status: 'ACTIVE', popular: true } });
  await prisma.route.create({ data: { fromCity: 'Иссык-Куль', toCity: 'Бишкек', durationLabel: '~5 ч', price: 200000, cabinPriceSedan: 800000, cabinPriceMinivan: 1300000, cabinPriceBus: 2200000, dailyTrips: 2, status: 'ACTIVE' } });
  await prisma.route.create({ data: { fromCity: 'Бишкек', toCity: 'Каракол', durationLabel: '~6 ч', price: 250000, dailyTrips: 0, status: 'DRAFT' } });

  // Flights: today + tomorrow on Бишкек→Алматы, plus one to Иссык-Куль today.
  // cabinPrice: flat "весь салон" price — cheaper than 11 × per-seat, the "hook" to buy the whole car.
  const f14 = await prisma.flight.create({ data: { routeId: rBA.id, carId: car1.id, departAt: at(14), seatsTotal: 11, cabinPrice: 2_000_000, pickupAddress: 'г. Бишкек, ул. Чуй 120', dropoffAddress: 'г. Алматы, ул. Абая 10' } });
  const f17 = await prisma.flight.create({ data: { routeId: rBA.id, carId: car2.id, departAt: at(17), seatsTotal: 11, cabinPrice: 2_000_000 } });
  const f20 = await prisma.flight.create({ data: { routeId: rBA.id, carId: car3.id, departAt: at(20), seatsTotal: 11, cabinPrice: 2_000_000 } });
  await prisma.flight.create({ data: { routeId: rBA.id, carId: car1.id, departAt: at(8, 0, 1), seatsTotal: 11, cabinPrice: 2_000_000 } });
  await prisma.flight.create({ data: { routeId: rBA.id, carId: car2.id, departAt: at(15, 0, 1), seatsTotal: 11, cabinPrice: 2_000_000 } });
  const fBI = await prisma.flight.create({ data: { routeId: rBI.id, carId: car3.id, departAt: at(8), seatsTotal: 11, cabinPrice: 1_200_000 } });
  await prisma.flight.create({ data: { routeId: rAB.id, carId: car2.id, departAt: at(8, 0, 1), seatsTotal: 11, cabinPrice: 2_000_000 } });

  // Clients.
  const aigul = await prisma.client.create({ data: { name: 'Айгуль Сапарова', phone: '+996700123456', whatsapp: true } });
  const timur = await prisma.client.create({ data: { name: 'Тимур Джапаров', phone: '+996555887766', whatsapp: true } });
  const nurlan = await prisma.client.create({ data: { name: 'Нурлан Кадыров', phone: '+996700332211', whatsapp: true } });

  // Bookings — created consistently with seats + counters.
  let seq = 1041;
  async function book(client: { id: string }, flight: { id: string; routeId: string }, pax: number, price: number, status: 'NEW' | 'CONFIRMED' | 'COMPLETED') {
    const total = price * pax;
    seq += 1;
    await prisma.booking.create({ data: { code: `№${seq}`, clientId: client.id, flightId: flight.id, pax, total, status } });
    if (status !== 'COMPLETED') {
      await prisma.flight.update({ where: { id: flight.id }, data: { seatsTaken: { increment: pax } } });
    }
    await prisma.client.update({ where: { id: client.id }, data: { tripsCount: { increment: 1 }, totalSum: { increment: total }, lastBookingAt: new Date() } });
  }

  await book(aigul, f14, 2, 350000, 'NEW');
  await book(timur, f17, 1, 350000, 'CONFIRMED');
  await book(nurlan, fBI, 4, 200000, 'CONFIRMED');
  await book(aigul, f20, 1, 350000, 'COMPLETED');

  // Applications.
  await prisma.driverApplication.create({ data: { name: 'Марат Бектуров', phone: '+996700456789', hasCar: true, carInfo: 'KIA Carnival, 11 мест', experience: '6 лет', directions: 'Бишкек — Алматы', status: 'NEW' } });
  await prisma.partnerApplication.create({ data: { company: 'Иссык-Куль Резорт', sphere: 'База отдыха', contacts: '+996700999888', proposal: 'Трансфер гостей из аэропорта', status: 'NEW' } });

  // One DailyStat row for today so analytics has data.
  await prisma.dailyStat.create({
    data: { date: dateOnly(0), routeId: rBA.id, ordersCount: 3, revenue: 350000 * 4, newClients: 2, returningClients: 1 },
  });

  console.log('✅ Seed complete. Login: +996700000001 / easygo123 (owner)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
