import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Booking, DashboardSummary } from '@easygo/shared';
import { formatMoney, paxLabel } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { bookingRouteLabel, dateTimeLabel } from '@/lib/format';

/** Dashboard: KPI summary cards plus the most recent bookings, loaded together. */
export function useDashboardModel() {
  const router = useRouter();
  const config = useConfigStore();

  const loading = ref(true);
  const error = ref<string | null>(null);
  const summary = ref<DashboardSummary | null>(null);
  const recent = ref<Booking[]>([]);

  function money(minor: number): string {
    return formatMoney(minor, config.currency, config.locale);
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await config.ensure();
      const [dash, bookings] = await Promise.all([
        api.analytics.dashboard(),
        api.bookings.list({ limit: 6, offset: 0 }),
      ]);
      summary.value = dash;
      recent.value = bookings.items;
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);

  return {
    router,
    loading,
    error,
    summary,
    recent,
    load,
    money,
    bookingRouteLabel,
    dateTimeLabel,
    paxLabel,
  };
}
