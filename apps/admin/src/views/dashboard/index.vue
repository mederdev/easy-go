<script setup lang="ts">
import DataCard from '@/components/DataCard.vue';
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useDashboardModel } from './model';

const {
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
} = useDashboardModel();
</script>

<template>
  <StateBlock :loading="loading" :error="error" @retry="load">
    <div v-if="summary" class="cards">
      <DataCard
        label="Заявки сегодня"
        :value="String(summary.ordersToday)"
        icon="receipt_long"
        :hint="`Новых: ${summary.newBookings}`"
        trend="up"
      />
      <DataCard
        label="Продано мест · сегодня"
        :value="String(summary.seatsSoldToday)"
        icon="event_seat"
        :hint="`Активных рейсов: ${summary.activeFlights}`"
      />
      <DataCard
        label="Свободно авто"
        :value="String(summary.availableCars)"
        icon="directions_car"
        :hint="`Рейсов сегодня: ${summary.activeFlights}`"
      />
      <DataCard
        label="Выручка · сегодня"
        :value="money(summary.revenueToday)"
        icon="payments"
        hint="Оборот за сегодня"
        trend="up"
        dark
      />
    </div>

    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Последние заявки</div>
        <button class="link" type="button" @click="router.push('/bookings')">
          Открыть CRM
        </button>
      </div>

      <EmptyState
        v-if="recent.length === 0"
        icon="receipt_long"
        title="Пока нет заявок"
        description="Новые бронирования появятся здесь."
      />
      <template v-else>
        <div class="row head-row">
          <span>№</span>
          <span>Клиент</span>
          <span>Маршрут</span>
          <span>Дата · время</span>
          <span>Пасс.</span>
          <span>Сумма</span>
          <span>Статус</span>
        </div>
        <div v-for="b in recent" :key="b.id" class="row">
          <span class="muted">{{ b.code }}</span>
          <span class="strong">{{ b.client?.name ?? '—' }}</span>
          <span class="strong">{{ bookingRouteLabel(b) }}</span>
          <span class="muted">{{ dateTimeLabel(b.flight?.departAt) }}</span>
          <span class="strong">{{ paxLabel(b.pax) }}</span>
          <span class="strong">{{ money(b.total) }}</span>
          <span><StatusChip kind="booking" :status="b.status" /></span>
        </div>
      </template>
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
  margin-bottom: 14px;
}
.panel-title {
  font: 800 16px var(--eg-font);
}
.link {
  border: none;
  background: transparent;
  color: var(--eg-brand);
  font: 700 12px var(--eg-font);
  cursor: pointer;
}
.row {
  display: grid;
  grid-template-columns: 90px 1.4fr 1.4fr 1.2fr 100px 120px 120px;
  align-items: center;
  font: 600 13px var(--eg-font);
  padding: 12px 4px;
  border-bottom: 1px solid #f4f5f2;
}
.head-row {
  font: 700 11px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #eef0ec;
  padding-bottom: 10px;
}
.muted {
  color: var(--eg-muted);
}
.strong {
  font-weight: 700;
}
</style>
