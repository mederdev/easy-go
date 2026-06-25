import { computed, onMounted, ref } from 'vue';
import type { AnalyticsSeries, DailyStat, Route } from '@easygo/shared';
import { formatMoney } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { isoDateDaysAgo, routeLabel, todayISODate } from '@/lib/format';

/** Analytics dashboard: KPI cards, an orders-per-day bar chart, the
 *  returning-vs-new client donut, and revenue grouped by direction — all
 *  derived from a precomputed DailyStat series. */
export function useAnalyticsModel() {
  const config = useConfigStore();

  const loading = ref(true);
  const error = ref<string | null>(null);
  const series = ref<AnalyticsSeries | null>(null);
  const routes = ref<Route[]>([]);

  function money(minor: number): string {
    return formatMoney(minor, config.currency, config.locale);
  }

  // routeId → "Бишкек → Алматы" for the revenue-by-direction panel.
  const routeNames = computed(() => {
    const map = new Map<string, string>();
    for (const r of routes.value) map.set(r.id, routeLabel(r));
    return map;
  });

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await config.ensure();
      const [s, r] = await Promise.all([
        api.analytics.series({ from: isoDateDaysAgo(55), to: todayISODate() }),
        api.routes.list(),
      ]);
      series.value = s;
      routes.value = r;
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  const points = computed<DailyStat[]>(() => series.value?.points ?? []);

  const maxOrders = computed(() => {
    const max = Math.max(0, ...points.value.map((p) => p.ordersCount));
    return max === 0 ? 1 : max;
  });

  function barHeight(p: DailyStat): number {
    return Math.max(4, Math.round((p.ordersCount / maxOrders.value) * 100));
  }

  function barColor(p: DailyStat): string {
    const ratio = p.ordersCount / maxOrders.value;
    if (ratio >= 0.75) return '#56A919';
    if (ratio >= 0.45) return '#B8DBA0';
    return '#D8E8C8';
  }

  function shortDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  const totals = computed(() => {
    const newClients = points.value.reduce((s, p) => s + p.newClients, 0);
    const returningClients = points.value.reduce((s, p) => s + p.returningClients, 0);
    const totalClients = newClients + returningClients;
    const returningPct = totalClients === 0 ? 0 : Math.round((returningClients / totalClients) * 100);
    return { newClients, returningClients, totalClients, returningPct };
  });

  // Revenue grouped by route id (analytics points carry routeId).
  const revenueByRoute = computed(() => {
    const map = new Map<string, number>();
    for (const p of points.value) {
      const key = p.routeId ?? 'other';
      map.set(key, (map.get(key) ?? 0) + p.revenue);
    }
    return Array.from(map.entries())
      .map(([id, revenue]) => ({
        id,
        revenue,
        name: id === 'other' ? 'Прочие' : routeNames.value.get(id) ?? 'Без маршрута',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  });

  const pieStyle = computed(() => ({
    background: `conic-gradient(#56A919 0 ${totals.value.returningPct}%, #D8E8C8 ${totals.value.returningPct}% 100%)`,
  }));

  onMounted(load);

  return {
    loading,
    error,
    series,
    load,
    money,
    points,
    barHeight,
    barColor,
    shortDate,
    totals,
    revenueByRoute,
    pieStyle,
  };
}
