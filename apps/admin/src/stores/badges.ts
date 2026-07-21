import { defineStore } from 'pinia';
import { api } from '@/lib/api';

interface BadgesState {
  /** New bookings + new individual (custom) requests awaiting an operator. */
  bookings: number;
  /** New cooperation requests (drivers + partners) not yet accepted/declined. */
  applications: number;
  timer: ReturnType<typeof setInterval> | null;
}

/**
 * Sidebar attention counters. Each badge counts only the NEW (untouched) items:
 * a booking/request/application leaves the count as soon as it's confirmed,
 * accepted or declined. Refreshed on a poll and after any status change.
 */
export const useBadgesStore = defineStore('badges', {
  state: (): BadgesState => ({ bookings: 0, applications: 0, timer: null }),

  actions: {
    async refresh(): Promise<void> {
      try {
        // limit:1 — we only need the `total`, not the rows.
        const [newBookings, newCustom, newDrivers, newPartners] = await Promise.all([
          api.bookings.list({ status: 'NEW', limit: 1, offset: 0 }),
          api.customRequests.list({ status: 'NEW', limit: 1, offset: 0 }),
          api.applications.listDrivers({ status: 'NEW', limit: 1, offset: 0 }),
          api.applications.listPartners({ status: 'NEW', limit: 1, offset: 0 }),
        ]);
        this.bookings = newBookings.total + newCustom.total;
        this.applications = newDrivers.total + newPartners.total;
      } catch {
        // Keep the previous counts on a transient failure.
      }
    },

    /** Begin polling (idempotent). Call once after login / on layout mount. */
    start(): void {
      if (this.timer) return;
      void this.refresh();
      this.timer = setInterval(() => void this.refresh(), 60_000);
    },

    stop(): void {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.bookings = 0;
      this.applications = 0;
    },
  },
});
