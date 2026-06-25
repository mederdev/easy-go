<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { AnalyticsSeries, DailyStat, Route } from '@easygo/shared';
import { formatMoney } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { isoDateDaysAgo, routeLabel, todayISODate } from '@/lib/format';
import DataCard from '@/components/DataCard.vue';
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';

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
</script>

<template>
  <StateBlock :loading="loading" :error="error" @retry="load">
    <div v-if="series">
      <div class="cards">
        <DataCard
          label="Заявок за период"
          :value="String(series.totalOrders)"
          icon="receipt_long"
        />
        <DataCard
          label="Выручка за период"
          :value="money(series.totalRevenue)"
          icon="payments"
          dark
        />
        <DataCard
          label="Новых клиентов"
          :value="String(totals.newClients)"
          icon="person_add"
        />
        <DataCard
          label="Постоянных клиентов"
          :value="`${totals.returningPct}%`"
          icon="groups"
        />
      </div>

      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Заявки по дням</div>
          <div class="panel-note">{{ shortDate(series.from) }} — {{ shortDate(series.to) }}</div>
        </div>
        <EmptyState
          v-if="points.length === 0"
          icon="monitoring"
          title="Нет данных за период"
        />
        <div v-else class="chart">
          <div v-for="p in points" :key="p.id" class="bar-col">
            <div class="bar" :style="{ height: `${barHeight(p)}%`, background: barColor(p) }" />
            <span class="bar-label">{{ shortDate(p.date) }}</span>
          </div>
        </div>
      </div>

      <div class="two-col">
        <div class="panel">
          <div class="panel-title">Постоянные vs новые</div>
          <div class="donut-row">
            <div class="donut" :style="pieStyle">
              <div class="donut-center">
                <div class="donut-value">{{ totals.returningPct }}%</div>
                <div class="donut-cap">постоянные</div>
              </div>
            </div>
            <div class="legend">
              <div class="legend-item">
                <span class="swatch green" />
                Постоянные · {{ totals.returningClients }}
              </div>
              <div class="legend-item">
                <span class="swatch light" />
                Новые · {{ totals.newClients }}
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">Выручка по направлениям</div>
          <EmptyState
            v-if="revenueByRoute.length === 0"
            icon="route"
            title="Нет данных"
          />
          <div v-else class="rev-list">
            <template v-for="(r, i) in revenueByRoute" :key="r.id">
              <div class="rev-row">
                <span>{{ r.name }}</span>
                <span class="rev-amount">{{ money(r.revenue) }}</span>
              </div>
              <div v-if="i < revenueByRoute.length - 1" class="rev-divider" />
            </template>
          </div>
        </div>
      </div>
    </div>
  </StateBlock>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.panel {
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  padding: 20px 22px;
  margin-top: 16px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.panel-title {
  font: 800 16px var(--eg-font);
  margin-bottom: 14px;
}
.panel-head .panel-title {
  margin-bottom: 0;
}
.panel-note {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
}
.chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 200px;
  padding: 0 6px;
}
.bar-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  height: 100%;
}
.bar {
  width: 100%;
  max-width: 30px;
  border-radius: 6px 6px 0 0;
  transition: height 0.2s ease;
}
.bar-label {
  font: 700 9px var(--eg-font);
  color: var(--eg-hint);
  white-space: nowrap;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.donut-row {
  display: flex;
  align-items: center;
  gap: 24px;
}
.donut {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.donut-center {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.donut-value {
  font: 800 20px var(--eg-font);
}
.donut-cap {
  font: 600 9px var(--eg-font);
  color: var(--eg-hint);
}
.legend {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 9px;
  font: 700 13px var(--eg-font);
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.swatch.green {
  background: #56a919;
}
.swatch.light {
  background: #d8e8c8;
}
.rev-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.rev-row {
  display: flex;
  justify-content: space-between;
  font: 600 13px var(--eg-font);
}
.rev-amount {
  font-weight: 800;
}
.rev-divider {
  height: 1px;
  background: #eef0ec;
}
</style>
