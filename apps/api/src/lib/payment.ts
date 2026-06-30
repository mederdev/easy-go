import type { Prisma, PrismaClient } from '@prisma/client';
import type { PaymentStatus } from '@easygo/shared';

/** Prisma client or an interactive-transaction client. */
type Tx = PrismaClient | Prisma.TransactionClient;

/** Booking lifecycle statuses that still count toward a flight's payment total. */
const ACTIVE_BOOKING_STATUSES = ['NEW', 'CONFIRMED', 'COMPLETED'] as const;

/**
 * Booking payment state derived from the prepaid amount vs the amount due.
 * The "mark paid" action overrides this to PAID without touching the amounts.
 */
export function derivePaymentStatus(prepaid: number, total: number): PaymentStatus {
  if (total > 0 && prepaid >= total) return 'PAID';
  if (prepaid > 0) return 'PARTIAL';
  return 'UNPAID';
}

/**
 * Recompute and persist a flight's aggregated payment status from its active
 * bookings: all PAID → PAID, all UNPAID → UNPAID, otherwise PARTIAL (no active
 * bookings → UNPAID). Call after any booking payment/lifecycle change.
 */
export async function recomputeFlightPayment(tx: Tx, flightId: string): Promise<PaymentStatus> {
  const bookings = await tx.booking.findMany({
    where: { flightId, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    select: { paymentStatus: true },
  });

  let status: PaymentStatus = 'UNPAID';
  if (bookings.length > 0) {
    const allPaid = bookings.every((b) => b.paymentStatus === 'PAID');
    const allUnpaid = bookings.every((b) => b.paymentStatus === 'UNPAID');
    status = allPaid ? 'PAID' : allUnpaid ? 'UNPAID' : 'PARTIAL';
  }

  await tx.flight.update({ where: { id: flightId }, data: { paymentStatus: status } });
  return status;
}
