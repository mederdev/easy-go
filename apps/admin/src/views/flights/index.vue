<script setup lang="ts">
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppModal from '@/components/AppModal.vue';
import { useFlightsModel } from './model';

const {
  loading,
  error,
  flights,
  routes,
  cars,
  load,
  modalOpen,
  saving,
  formError,
  statuses,
  form,
  closeModal,
  save,
  pct,
  barColor,
  todayLabel,
  flightRouteLabel,
  routeLabel,
  timeLabel,
  FLIGHT_STATUS_LABEL,
} = useFlightsModel();
</script>

<template>
  <div>
    <div class="day-label">{{ todayLabel }}</div>
    <StateBlock :loading="loading" :error="error" @retry="load">
      <EmptyState
        v-if="flights.length === 0"
        icon="event_seat"
        title="Рейсов нет"
        description="Создайте рейс, чтобы открыть продажи."
      />
      <div v-else class="grid">
        <div v-for="f in flights" :key="f.id" class="card">
          <div class="card-head">
            <div>
              <div class="route">{{ flightRouteLabel(f) }}</div>
              <div class="meta">
                {{ f.car?.model ?? 'Без авто' }}
                <template v-if="f.car?.driver"> · водитель {{ f.car.driver.name }}</template>
              </div>
            </div>
            <div class="time">{{ timeLabel(f.departAt) }}</div>
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
            <span class="status-note">{{ FLIGHT_STATUS_LABEL[f.status] }}</span>
          </div>
        </div>
      </div>
    </StateBlock>

    <AppModal
      :open="modalOpen"
      title="Новый рейс"
      subtitle="Маршрут, время отправления и автомобиль"
      @close="closeModal"
    >
      <form class="form" @submit.prevent="save">
        <label class="field">
          <span class="label">Маршрут</span>
          <select v-model="form.routeId">
            <option v-if="routes.length === 0" value="">Сначала добавьте маршрут</option>
            <option v-for="r in routes" :key="r.id" :value="r.id">{{ routeLabel(r) }}</option>
          </select>
        </label>
        <div class="two">
          <label class="field">
            <span class="label">Дата</span>
            <input v-model="form.date" type="date" />
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
              <option value="">Без авто</option>
              <option v-for="c in cars" :key="c.id" :value="c.id">{{ c.model }} · {{ c.plate }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Мест всего</span>
            <input v-model.number="form.seatsTotal" type="number" min="1" />
          </label>
        </div>
        <label class="field">
          <span class="label">Адрес подачи <span class="opt">(необязательно)</span></span>
          <input v-model="form.pickupAddress" placeholder="г. Бишкек, ул. Чуй 120" />
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
          {{ saving ? 'Сохранение…' : 'Создать рейс' }}
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
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.route {
  font: 800 17px var(--eg-font);
}
.meta {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
  margin-top: 2px;
}
.time {
  font: 800 22px var(--eg-font);
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
</style>
