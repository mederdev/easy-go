import { Worker } from 'bullmq';
import { CAR_TYPE_LABEL, formatMoney, paxLabel } from '@easygo/shared';
import { makeRedis } from './queue.js';
import { prisma } from './prisma.js';
import { getConfig } from '../modules/config/service.js';
import { escapeHtml, sendTelegramMessage } from './telegram-api.js';

/**
 * Sends Telegram notifications about new public bookings / custom requests to
 * the shared ops group (SystemConfig.telegramNotifyChatId) and to every
 * back-office user with a linked Telegram. Runs in-process like the stats
 * worker. Without a configured bot each send is console-logged ([TG mock]).
 */
export function startNotificationsWorker(): Worker {
  return new Worker(
    'notifications',
    async (job) => {
      if (job.name === 'booking-created') {
        const { bookingId } = job.data as { bookingId: string };
        await notifyBookingCreated(bookingId);
      } else if (job.name === 'custom-request-created') {
        const { id } = job.data as { id: string };
        await notifyCustomRequestCreated(id);
      }
    },
    { connection: makeRedis(), concurrency: 2 },
  );
}

// Business timezone for human-readable departure times (departAt is UTC).
const TIME_ZONE = 'Asia/Bishkek';

const formatDateTime = (d: Date) =>
  new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: TIME_ZONE }).format(d);

async function notifyBookingCreated(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { client: true, flight: { include: { route: true } } },
  });
  if (!booking) return; // deleted before the job ran — nothing to announce

  const config = await getConfig();
  const lines = [
    `<b>🚌 Новая бронь ${escapeHtml(booking.code)}</b>`,
    `Маршрут: ${escapeHtml(booking.flight.route.fromCity)} → ${escapeHtml(booking.flight.route.toCity)}`,
    `Отправление: ${formatDateTime(booking.flight.departAt)}`,
    `Мест: ${paxLabel(booking.pax)}`,
    `Клиент: ${escapeHtml(booking.client.name)}, ${booking.client.phone ?? 'телефон не указан'}`,
    `Сумма: ${formatMoney(booking.total, config.currency)}`,
  ];
  if (booking.comment) lines.push(`Комментарий: ${escapeHtml(booking.comment)}`);

  await broadcast(lines.join('\n'), config.telegramNotifyChatId);
}

async function notifyCustomRequestCreated(id: string): Promise<void> {
  const req = await prisma.customRequest.findUnique({ where: { id } });
  if (!req) return;

  const config = await getConfig();
  const details = [
    paxLabel(req.pax),
    req.carType ? CAR_TYPE_LABEL[req.carType] : null,
    req.wholeCabin ? 'весь салон' : null,
  ].filter(Boolean);
  const lines = [
    `<b>📝 Новая индивидуальная заявка</b>`,
    `Маршрут: ${escapeHtml(req.fromCity)} → ${escapeHtml(req.toCity)}`,
    `Дата: ${req.date}${req.time ? `, ${req.time}` : ''}`,
    details.join(' · '),
    `Телефон: ${req.phone}`,
  ];
  if (req.comment) lines.push(`Комментарий: ${escapeHtml(req.comment)}`);

  await broadcast(lines.join('\n'), config.telegramNotifyChatId);
}

/** Group chat + every linked staff DM; one blocked recipient never fails the job. */
async function broadcast(html: string, groupChatId: string | null): Promise<void> {
  const users = await prisma.user.findMany({
    where: { telegramId: { not: null } },
    select: { telegramId: true },
  });

  const recipients = new Set<string>();
  if (groupChatId) recipients.add(groupChatId);
  for (const u of users) if (u.telegramId) recipients.add(u.telegramId);

  for (const chatId of recipients) {
    try {
      await sendTelegramMessage(chatId, html);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[notifications] send to ${chatId} failed:`, err);
    }
  }
}
