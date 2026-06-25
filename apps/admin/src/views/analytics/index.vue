<script setup lang="ts">
import DataCard from '@/components/DataCard.vue';
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useAnalyticsModel } from './model';

const {
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
} = useAnalyticsModel();
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
