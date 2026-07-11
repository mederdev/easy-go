<script setup lang="ts">
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import FilterChip from '@/components/FilterChip.vue';
import DatePicker from '@/components/DatePicker.vue';
import AppModal from '@/components/AppModal.vue';
import { useFlightsModel } from './model';

const {
  config,
  loading,
  error,
  flights,
  routes,
  routeOptions,
  availableCars,
  load,
  routeFilter,
  dateFilter,
  statusFilter,
  setRouteFilter,
  setDateFilter,
  setStatusFilter,
  highlightedDates,
  onCalendarRange,
  modalOpen,
  saving,
  formError,
  statuses,
  form,
  maxSeats,
  minDate,
  isEditing,
  openEditFromDetail,
  closeModal,
  save,
  pct,
  barColor,
  isPast,
  todayLabel,
  flightRouteLabel,
  routeLabel,
  timeLabel,
  dateLabel,
  FLIGHT_STATUS_LABEL,
  BOOKING_STATUS_LABEL,
  detailOpen,
  detailFlight,
  detailBookings,
  detailLoading,
  detailError,
  openDetail,
  closeDetail,
  detailStatusEdit,
  detailDirty,
  detailStatusSaving,
  detailStatusError,
  saveDetailChanges,
  detailPaymentSaving,
  detailPaymentError,
  setFlightPaid,
  money,
  remaining,
  openBookingDetail,
} = useFlightsModel();
</script>

<template>
  <div>
    <div class="day-label">{{ todayLabel }}</div>

    <div class="filters">
      <div class="chips">
        <FilterChip
          label="Активные"
          :active="statusFilter === 'active'"
          @click="setStatusFilter('active')"
        />
        <FilterChip
          label="Все маршруты"
          :active="statusFilter === 'all' && routeFilter === ''"
          @click="setRouteFilter('')"
        />
        <FilterChip
          v-for="r in routes"
          :key="r.id"
          :label="routeLabel(r)"
          :active="routeFilter === r.id"
          @click="setRouteFilter(r.id)"
        />
      </div>
      <DatePicker
        class="date-picker"
        :model-value="dateFilter"
        :highlighted-dates="highlightedDates"
        placeholder="Все даты"
        @update:model-value="setDateFilter"
        @visible-range="onCalendarRange"
      />
    </div>

    <StateBlock :loading="loading" :error="error" @retry="load">
      <EmptyState
        v-if="flights.length === 0"
        icon="event_seat"
        title="Рейсов нет"
        description="Создайте рейс, чтобы открыть продажи."
      />
      <div v-else class="grid">
        <div
          v-for="f in flights"
          :key="f.id"
          class="card clickable"
          :class="{ past: isPast(f) }"
          @click="openDetail(f)"
        >
          <div class="card-head">
            <div>
              <div class="route">
                {{ flightRouteLabel(f) }}
              </div>
              <div class="meta">
                {{ f.car ? `${f.car.model} · ${f.car.plate}` : 'Без авто' }}
                <template v-if="f.car?.driver"> · водитель {{ f.car.driver.name }}</template>
              </div>
            </div>
            <div class="when">
              <div class="time">{{ timeLabel(f.departAt) }}</div>
              <div class="date">{{ dateLabel(f.departAt) }}</div>
            </div>
          </div>

          <div class="load">
            <div class="bar">
              <div class="fill" :style="{ width: `${pct(f)}%`, background: barColor(f) }" />
            </div>
            <span class="load-text">{{ f.seatsTaken }}/{{ f.seatsTotal }}</span>
          </div>

          <div class="card-foot">
            <StatusChip
              v-if="!f.fewSeats || f.status !== 'SCHEDULED'"
              kind="flight"
              :status="f.status"
            />
            <span v-else class="few-chip">Мало мест</span>
            <StatusChip kind="payment" :status="f.paymentStatus" />
            <span class="status-note">{{ FLIGHT_STATUS_LABEL[f.status] }}</span>
          </div>
        </div>
      </div>
    </StateBlock>

    <!-- Flight detail modal -->
    <AppModal
      :open="detailOpen"
      :title="detailFlight ? flightRouteLabel(detailFlight) : ''"
      :subtitle="detailFlight ? `${dateLabel(detailFlight.departAt)} · ${timeLabel(detailFlight.departAt)}` : ''"
      @close="closeDetail"
    >
      <div v-if="detailFlight" class="detail">
        <!-- Status row with editable selector -->
        <div class="detail-row">
          <StatusChip kind="flight" :status="detailFlight.status" />
          <StatusChip kind="payment" :status="detailFlight.paymentStatus" />
          <select v-if="detailStatusEdit !== null" v-model="detailStatusEdit" class="status-select">
            <option v-for="s in statuses" :key="s" :value="s">{{ FLIGHT_STATUS_LABEL[s] }}</option>
          </select>
        </div>
        <div v-if="detailStatusError" class="form-error">{{ detailStatusError }}</div>

        <!-- Car / driver -->
        <div class="detail-section">
          <div class="section-title">Водитель и автомобиль</div>
          <div v-if="detailFlight.car" class="info-grid">
            <div class="info-item">
              <span class="info-label">Автомобиль</span>
              <span class="info-val">{{ detailFlight.car.model }} · {{ detailFlight.car.plate }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Водитель</span>
              <span class="info-val">{{ detailFlight.car.driver?.name ?? 'Не назначен' }}</span>
            </div>
            <div v-if="detailFlight.car.driver?.phone" class="info-item">
              <span class="info-label">Телефон</span>
              <span class="info-val">{{ detailFlight.car.driver.phone }}</span>
            </div>
          </div>
          <div v-else class="no-car">Автомобиль не назначен</div>
        </div>

        <!-- Seats load -->
        <div class="detail-section">
          <div class="section-title">Загрузка</div>
          <div class="load detail-load">
            <div class="bar">
              <div class="fill" :style="{ width: `${pct(detailFlight)}%`, background: barColor(detailFlight) }" />
            </div>
            <span class="load-text">{{ detailFlight.seatsTaken }}/{{ detailFlight.seatsTotal }}</span>
          </div>
        </div>

        <!-- Pickup address -->
        <div v-if="detailFlight.pickupAddress" class="detail-section">
          <div class="section-title">Адрес подачи</div>
          <div class="info-val">{{ detailFlight.pickupAddress }}</div>
        </div>

        <!-- Dropoff address -->
        <div v-if="detailFlight.dropoffAddress" class="detail-section">
          <div class="section-title">Адрес высадки</div>
          <div class="info-val">{{ detailFlight.dropoffAddress }}</div>
        </div>

        <!-- Passengers -->
        <div class="detail-section">
          <div class="section-title">Пассажиры</div>
          <div v-if="detailLoading" class="pax-empty">Загрузка…</div>
          <div v-else-if="detailError" class="pax-error">{{ detailError }}</div>
          <div v-else-if="detailBookings.length === 0" class="pax-empty">Бронирований пока нет</div>
          <div v-else class="pax-list">
            <div v-for="b in detailBookings" :key="b.id" class="pax-row">
              <div class="pax-info">
                <span class="pax-name">{{ b.client?.name ?? '—' }}</span>
                <span class="pax-phone">{{ b.client?.phone ?? '' }}</span>
                <div class="pax-money">
                  <template v-if="b.paymentStatus === 'PAID'">
                    <span class="pax-due settled">Оплачено полностью</span>
                    <span class="pax-total">{{ money(b.total) }}</span>
                  </template>
                  <template v-else>
                    <span class="pax-paid">Оплачено {{ money(b.prepaid) }}</span>
                    <span class="pax-due" :class="{ settled: remaining(b) === 0 }">
                      {{ remaining(b) === 0 ? 'Оплачено полностью' : `Осталось ${money(remaining(b))}` }}
                    </span>
                    <span class="pax-total">из {{ money(b.total) }}</span>
                  </template>
                </div>
              </div>
              <div class="pax-right">
                <span class="pax-count">{{ b.pax }} чел.</span>
                <span class="pax-status" :class="`bs-${b.status.toLowerCase()}`">{{ BOOKING_STATUS_LABEL[b.status] }}</span>
                <StatusChip kind="payment" :status="b.paymentStatus" />
                <button
                  type="button"
                  class="pax-open"
                  title="Открыть бронирование"
                  @click="openBookingDetail(b)"
                >
                  <span class="material-symbols-outlined">open_in_new</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment (bulk mark paid / clear) -->
        <div class="detail-section">
          <div class="section-title">Оплата рейса</div>
          <div v-if="detailPaymentError" class="form-error">{{ detailPaymentError }}</div>
          <div class="pay-actions">
            <button
              v-if="detailFlight.paymentStatus !== 'PAID'"
              type="button"
              class="btn primary"
              :disabled="detailPaymentSaving"
              @click="setFlightPaid(true)"
            >
              {{ detailPaymentSaving ? 'Сохранение…' : 'Отметить рейс оплаченным' }}
            </button>
            <button
              v-else
              type="button"
              class="btn ghost"
              :disabled="detailPaymentSaving"
              @click="setFlightPaid(false)"
            >
              {{ detailPaymentSaving ? 'Сохранение…' : 'Отменить оплату у всех' }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <button type="button" class="btn ghost" @click="openEditFromDetail">
          Редактировать
        </button>
        <button
          type="button"
          class="btn primary"
          :disabled="detailStatusSaving || !detailDirty"
          @click="saveDetailChanges"
        >
          {{ detailStatusSaving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </template>
    </AppModal>

    <AppModal
      :open="modalOpen"
      :title="isEditing ? 'Редактирование рейса' : 'Новый рейс'"
      subtitle="Маршрут, время отправления и автомобиль"
      @close="closeModal"
    >
      <form class="form" @submit.prevent="save">
        <label class="field">
          <span class="label">Маршрут</span>
          <select v-model="form.routeId">
            <option v-if="routeOptions.length === 0" value="">Сначала добавьте активный маршрут</option>
            <option v-for="r in routeOptions" :key="r.id" :value="r.id">{{ routeLabel(r) }}</option>
          </select>
        </label>
        <div class="two">
          <label class="field">
            <span class="label">Дата</span>
            <DatePicker
              class="form-date"
              :model-value="form.date"
              :min="minDate"
              placeholder="Выберите дату"
              @update:model-value="form.date = $event"
            />
          </label>
          <label class="field">
            <span class="label">Время</span>
            <input v-model="form.time" type="time" />
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Автомобиль</span>
            <select v-model="form.carId">
              <option value="" disabled>Выберите машину</option>
              <option v-for="c in availableCars" :key="c.id" :value="c.id">{{ c.model }} · {{ c.plate }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">
              Мест всего
              <span v-if="maxSeats" class="opt">(макс. {{ maxSeats }})</span>
            </span>
            <input v-model.number="form.seatsTotal" type="number" min="1" :max="maxSeats ?? undefined" />
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Цена за весь салон ({{ config.currency }})</span>
            <input v-model="form.cabinPriceMajor" inputmode="decimal" placeholder="20000" />
          </label>
          <label class="field">
            <span class="label">Цена за место ({{ config.currency }})</span>
            <input v-model="form.seatPriceMajor" inputmode="decimal" placeholder="3500" />
          </label>
        </div>
        <label class="field">
          <span class="label">Адрес подачи <span class="opt">(необязательно)</span></span>
          <input v-model="form.pickupAddress" placeholder="г. Бишкек, ул. Чуй 120" />
        </label>
        <label class="field">
          <span class="label">Адрес высадки <span class="opt">(необязательно)</span></span>
          <input v-model="form.dropoffAddress" placeholder="г. Алматы, ул. Абая 10" />
        </label>
        <label class="field">
          <span class="label">Статус</span>
          <select v-model="form.status">
            <option v-for="s in statuses" :key="s" :value="s">{{ FLIGHT_STATUS_LABEL[s] }}</option>
          </select>
        </label>
        <div v-if="formError" class="form-error">{{ formError }}</div>
      </form>

      <template #footer>
        <button type="button" class="btn ghost" @click="closeModal">Отмена</button>
        <button type="button" class="btn primary" :disabled="saving" @click="save">
          {{ saving ? 'Сохранение…' : isEditing ? 'Сохранить рейс' : 'Создать рейс' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.day-label {
  font: 800 14px var(--eg-font);
  color: var(--eg-muted);
  margin-bottom: 12px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.date-picker {
  margin-left: auto;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.card {
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  padding: 18px 20px;
  min-width: 0;
}
/* Narrow phones: let the card and its route/text rows shrink, and let the
   status row wrap, so a single-column card fits instead of overflowing. */
.card-head,
.route {
  min-width: 0;
}
.card-foot {
  flex-wrap: wrap;
}
.clickable {
  cursor: pointer;
  transition: box-shadow 0.14s, border-color 0.14s;
}
.clickable:hover {
  border-color: var(--eg-brand);
  box-shadow: 0 4px 16px -6px rgba(86, 169, 25, 0.22);
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.route {
  font: 800 17px var(--eg-font);
  display: flex;
  align-items: center;
  gap: 8px;
}
.past-chip {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--eg-radius-pill);
  font: 700 10px var(--eg-font);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: #ececec;
  color: #71776e;
}
.meta {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
  margin-top: 2px;
}
.when {
  text-align: right;
  flex: none;
}
.time {
  font: 800 22px var(--eg-font);
  line-height: 1.1;
}
.date {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
  margin-top: 2px;
}
/* Past flights are dimmed so upcoming ones stand out. */
.card.past {
  background: #fafafa;
}
.card.past .route,
.card.past .time {
  color: #8a9086;
}
.load {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}
.bar {
  flex: 1;
  height: 8px;
  background: #f0f1ee;
  border-radius: 8px;
  overflow: hidden;
}
.fill {
  height: 100%;
  border-radius: 8px;
}
.load-text {
  font: 800 13px var(--eg-font);
}
.card-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}
.few-chip {
  display: inline-block;
  padding: 4px 11px;
  border-radius: var(--eg-radius-pill);
  font: 700 11px var(--eg-font);
  background: #fef3e2;
  color: #c77a18;
}
.status-note {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
  margin-left: auto;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
}
.opt {
  color: #c4c8c0;
}
.form input,
.form select {
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  font: 600 14px var(--eg-font);
  outline: none;
  background: #fff;
}
.form input:focus,
.form select:focus {
  border-color: var(--eg-brand);
}
/* Brand date picker sized to match sibling form inputs */
.form-date {
  display: block;
}
.form-date :deep(.trigger) {
  width: 100%;
  height: 46px;
  border-radius: 11px;
  padding: 0 12px;
}
.form-error {
  background: #fbedea;
  color: #c0492e;
  font: 600 13px var(--eg-font);
  padding: 10px 12px;
  border-radius: 10px;
}
.btn {
  height: 44px;
  padding: 0 20px;
  border-radius: 12px;
  font: 700 14px var(--eg-font);
  cursor: pointer;
}
.btn.ghost {
  border: 1px solid var(--eg-border);
  background: #fff;
  color: var(--eg-ink);
}
.btn.primary {
  border: none;
  background: var(--eg-brand);
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
  cursor: default;
}

/* ── Detail modal ─────────────────────────────────────────── */
.detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--eg-border);
  border-radius: 10px;
  font: 600 13px var(--eg-font);
  background: #fff;
  outline: none;
  cursor: pointer;
}
.status-select:focus {
  border-color: var(--eg-brand);
}
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-title {
  font: 700 11px var(--eg-font);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--eg-muted);
}
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.info-label {
  font: 500 13px var(--eg-font);
  color: var(--eg-hint);
}
.info-val {
  font: 600 13px var(--eg-font);
  color: var(--eg-ink);
}
.no-car {
  font: 500 13px var(--eg-font);
  color: var(--eg-muted);
}
.detail-load {
  margin-top: 4px;
}
.pax-empty {
  font: 500 13px var(--eg-font);
  color: var(--eg-muted);
}
.pax-error {
  font: 600 13px var(--eg-font);
  color: #c0492e;
}
.pax-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pax-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px;
  border-radius: 10px;
  background: #f8f9f6;
}
.pax-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pax-name {
  font: 700 13px var(--eg-font);
}
.pax-phone {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
}
.pax-money {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  margin-top: 3px;
}
.pax-paid {
  font: 700 12px var(--eg-font);
  color: var(--eg-brand-dark);
}
.pax-due {
  font: 700 12px var(--eg-font);
  color: #c77a18;
}
.pax-due.settled {
  color: #3e7c12;
}
.pax-total {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
}
.pax-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.pax-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--eg-border);
  border-radius: 9px;
  background: #fff;
  color: var(--eg-muted);
  cursor: pointer;
  padding: 0;
}
.pax-open:hover {
  border-color: var(--eg-brand);
  color: var(--eg-brand-dark);
}
.pax-open .material-symbols-outlined {
  font-size: 17px;
}
.pay-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.pax-count {
  font: 700 13px var(--eg-font);
}
.pax-status {
  font: 600 11px var(--eg-font);
  padding: 2px 8px;
  border-radius: 99px;
}
.bs-new       { background: #e8f4fd; color: #1a6fa8; }
.bs-confirmed { background: #eef6e6; color: #3e7c12; }
.bs-completed { background: #f0f1ee; color: #5a6355; }
.bs-cancelled { background: #fbedea; color: #c0492e; }

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .two {
    grid-template-columns: 1fr;
  }
  .date-picker {
    margin-left: 0;
  }
}
</style>
