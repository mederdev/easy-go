<script setup lang="ts">
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import AppModal from '@/components/AppModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import CitySearchInput from '@/components/CitySearchInput.vue';
import { useRoutesModel } from './model';

const {
  config,
  loading,
  error,
  routes,
  load,
  modalOpen,
  editing,
  saving,
  formError,
  statuses,
  form,
  openEdit,
  closeModal,
  save,
  remove,
  money,
  routeLabel,
  ROUTE_STATUS_LABEL,
} = useRoutesModel();
</script>

<template>
  <div>
    <div class="hint-bar">
      <span class="material-symbols-outlined">lightbulb</span>
      <span>Новые направления добавляются прямо из панели — без участия разработчиков.</span>
    </div>

    <StateBlock :loading="loading" :error="error" @retry="load">
      <div class="table">
        <div class="row head-row">
          <span>Маршрут</span>
          <span>В пути</span>
          <span>Цена / место</span>
          <span>Рейсов в день</span>
          <span>Статус</span>
          <span></span>
        </div>
        <EmptyState
          v-if="routes.length === 0"
          icon="route"
          title="Маршрутов пока нет"
          description="Добавьте первое направление."
        />
        <div v-for="r in routes" :key="r.id" class="row data-row">
          <span class="strong route-name">
            {{ routeLabel(r) }}
            <span
              v-if="r.popular"
              class="material-symbols-outlined pop-star"
              title="Показывается в популярных"
            >star</span>
          </span>
          <span class="muted">{{ r.durationLabel }}</span>
          <span class="strong">{{ money(r.price) }}</span>
          <span class="muted">{{ r.dailyTrips }}</span>
          <span><StatusChip kind="route" :status="r.status" /></span>
          <span class="actions">
            <button type="button" class="icon-btn" title="Изменить" @click="openEdit(r)">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button type="button" class="icon-btn danger" title="Удалить" @click="remove(r)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </span>
        </div>
      </div>

      <!-- Mobile cards (hidden on desktop) -->
      <div class="m-cards">
        <EmptyState
          v-if="routes.length === 0"
          icon="route"
          title="Маршрутов пока нет"
          description="Добавьте первое направление."
        />
        <div v-for="r in routes" :key="r.id" class="m-card">
          <div class="m-card-top">
            <div class="m-title">
              {{ routeLabel(r) }}
              <span
                v-if="r.popular"
                class="material-symbols-outlined pop-star"
                title="Показывается в популярных"
              >star</span>
            </div>
            <StatusChip kind="route" :status="r.status" />
          </div>
          <div class="m-meta">
            <div class="m-meta-item">
              <span class="m-cap">В пути</span>
              <span class="m-val">{{ r.durationLabel }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Цена / место</span>
              <span class="m-val">{{ money(r.price) }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Рейсов в день</span>
              <span class="m-val">{{ r.dailyTrips }}</span>
            </div>
          </div>
          <div class="m-actions">
            <button type="button" class="icon-btn edit" @click="openEdit(r)">
              <span class="material-symbols-outlined">edit</span>
              Изменить
            </button>
            <button type="button" class="icon-btn danger" title="Удалить" @click="remove(r)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    </StateBlock>

    <AppModal
      :open="modalOpen"
      :title="editing ? 'Редактировать маршрут' : 'Новый маршрут'"
      subtitle="Направление, время и цена за место"
      @close="closeModal"
    >
      <form class="form" @submit.prevent="save">
        <div class="two">
          <label class="field">
            <span class="label">Откуда</span>
            <CitySearchInput v-model="form.fromCity" placeholder="Город отправления" />
          </label>
          <label class="field">
            <span class="label">Куда</span>
            <CitySearchInput v-model="form.toCity" placeholder="Город назначения" />
          </label>
        </div>
        <label class="field">
          <span class="label">Время в пути</span>
          <input v-model="form.durationLabel" placeholder="~4 ч" />
        </label>
        <div class="two">
          <label class="field">
            <span class="label">Цена за место ({{ config.currency }})</span>
            <input v-model="form.priceMajor" inputmode="decimal" placeholder="3500" />
          </label>
          <label class="field">
            <span class="label">Рейсов в день</span>
            <input v-model.number="form.dailyTrips" type="number" min="0" />
          </label>
        </div>
        <div class="field">
          <span class="label">Цена за весь салон ({{ config.currency }})</span>
          <span class="hint-sub">Ориентир для индивидуальных заявок — своя цена под каждый тип машины.</span>
          <div class="three">
            <label class="field">
              <span class="label sub">Минивэн</span>
              <input v-model="form.cabinMinivanMajor" inputmode="decimal" placeholder="20000" />
            </label>
            <label class="field">
              <span class="label sub">Седан</span>
              <input v-model="form.cabinSedanMajor" inputmode="decimal" placeholder="12000" />
            </label>
            <label class="field">
              <span class="label sub">Бус</span>
              <input v-model="form.cabinBusMajor" inputmode="decimal" placeholder="35000" />
            </label>
          </div>
        </div>
        <label class="field">
          <span class="label">Статус</span>
          <select v-model="form.status">
            <option v-for="s in statuses" :key="s" :value="s">{{ ROUTE_STATUS_LABEL[s] }}</option>
          </select>
        </label>
        <label class="check">
          <input v-model="form.popular" type="checkbox" />
          <span class="check-body">
            <span class="check-title">Показывать в «Популярных маршрутах»</span>
            <span class="check-sub">Маршрут появится на главном экране приложения (только для активных).</span>
          </span>
        </label>
        <div v-if="formError" class="form-error">{{ formError }}</div>
      </form>

      <template #footer>
        <button type="button" class="btn ghost" @click="closeModal">Отмена</button>
        <button type="button" class="btn primary" :disabled="saving" @click="save">
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.hint-bar {
  background: var(--eg-brand-light);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  font: 600 13px var(--eg-font);
  color: var(--eg-brand-dark);
}
.hint-bar .material-symbols-outlined {
  font-size: 22px;
}
.table {
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  overflow: hidden;
}
.row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.2fr 120px 90px;
  align-items: center;
  font: 600 13px var(--eg-font);
  padding: 15px 20px;
  border-bottom: 1px solid #f4f5f2;
}
.head-row {
  font: 700 11px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #eef0ec;
}
.muted {
  color: var(--eg-muted);
}
.strong {
  font-weight: 700;
}
.actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid var(--eg-border);
  background: #fff;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn .material-symbols-outlined {
  font-size: 18px;
  color: var(--eg-muted);
}
.icon-btn.danger .material-symbols-outlined {
  color: #c0492e;
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
.three {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
.hint-sub {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
  margin: -2px 0 2px;
}
.label.sub {
  font-weight: 500;
  text-transform: none;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.label {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
}
input,
select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  font: 600 14px var(--eg-font);
  outline: none;
  background: #fff;
}
input:focus,
select:focus {
  border-color: var(--eg-brand);
}
.route-name,
.m-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pop-star {
  font-size: 18px;
  color: #e0a500;
  font-variation-settings: 'FILL' 1;
}
.check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}
.check input {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
  accent-color: var(--eg-brand);
}
.check-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.check-title {
  font: 600 13px var(--eg-font);
  color: var(--eg-ink);
}
.check-sub {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
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

/* Mobile card list — hidden on desktop, shown instead of the table on phones. */
.m-cards {
  display: none;
  flex-direction: column;
  gap: 12px;
}
.m-card {
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  padding: 16px;
}
.m-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.m-title {
  font: 800 16px var(--eg-font);
  min-width: 0;
}
.m-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 22px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0f1ee;
}
.m-meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.m-cap {
  font: 600 11px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.m-val {
  font: 700 14px var(--eg-font);
}
.m-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.m-actions .icon-btn {
  height: 42px;
  gap: 6px;
  font: 700 13px var(--eg-font);
  color: var(--eg-ink);
}
.m-actions .icon-btn.edit {
  flex: 1;
}
.m-actions .icon-btn.danger {
  width: 48px;
}

@media (max-width: 720px) {
  .two,
  .three {
    grid-template-columns: 1fr;
  }
  .table {
    display: none;
  }
  .m-cards {
    display: flex;
  }
}
</style>
