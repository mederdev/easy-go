<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CreateRouteInput, Route, RouteStatus } from '@easygo/shared';
import {
  CITIES,
  ROUTE_STATUS_LABEL,
  formatMoney,
  toMajor,
  toMinor,
} from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { routeLabel } from '@/lib/format';
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import AppModal from '@/components/AppModal.vue';
import EmptyState from '@/components/EmptyState.vue';

const config = useConfigStore();
const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);
const routes = ref<Route[]>([]);

const modalOpen = ref(false);
const editing = ref<Route | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);

const cities = CITIES;
const statuses: RouteStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

const form = reactive({
  fromCity: cities[0] as string,
  toCity: cities[1] as string,
  durationLabel: '',
  priceMajor: '' as string,
  dailyTrips: 0,
  status: 'ACTIVE' as RouteStatus,
});

function money(minor: number): string {
  return formatMoney(minor, config.currency, config.locale);
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    await config.ensure();
    routes.value = await api.routes.list();
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  form.fromCity = cities[0];
  form.toCity = cities[1];
  form.durationLabel = '';
  form.priceMajor = '';
  form.dailyTrips = 0;
  form.status = 'ACTIVE';
}

function openCreate(): void {
  editing.value = null;
  resetForm();
  formError.value = null;
  modalOpen.value = true;
}

function openEdit(r: Route): void {
  editing.value = r;
  form.fromCity = r.fromCity;
  form.toCity = r.toCity;
  form.durationLabel = r.durationLabel;
  form.priceMajor = String(toMajor(r.price, config.currency));
  form.dailyTrips = r.dailyTrips;
  form.status = r.status;
  formError.value = null;
  modalOpen.value = true;
}

function closeModal(): void {
  modalOpen.value = false;
  // Clear the ?create=1 flag so re-clicking the CTA reopens it.
  if (route.query.create) {
    void router.replace({ query: { ...route.query, create: undefined } });
  }
}

async function save(): Promise<void> {
  formError.value = null;
  if (!form.durationLabel.trim()) {
    formError.value = 'Укажите время в пути.';
    return;
  }
  const priceNum = Number(String(form.priceMajor).replace(',', '.'));
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    formError.value = 'Укажите корректную цену.';
    return;
  }
  saving.value = true;
  try {
    const payload: CreateRouteInput = {
      fromCity: form.fromCity,
      toCity: form.toCity,
      durationLabel: form.durationLabel.trim(),
      price: toMinor(priceNum, config.currency),
      dailyTrips: Number(form.dailyTrips) || 0,
      status: form.status,
    };
    if (editing.value) {
      await api.routes.update(editing.value.id, payload);
    } else {
      await api.routes.create(payload);
    }
    modalOpen.value = false;
    await load();
  } catch (e) {
    formError.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

async function remove(r: Route): Promise<void> {
  if (!window.confirm(`Удалить маршрут «${routeLabel(r)}»?`)) return;
  try {
    await api.routes.remove(r.id);
    await load();
  } catch (e) {
    error.value = errorMessage(e);
  }
}

// Open the create modal when the topbar CTA navigates here with ?create=1.
watch(
  () => route.query.create,
  (v) => {
    if (v) openCreate();
  },
  { immediate: true },
);

onMounted(load);
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
          <span class="strong">{{ routeLabel(r) }}</span>
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
            <select v-model="form.fromCity">
              <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Куда</span>
            <select v-model="form.toCity">
              <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
            </select>
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
        <label class="field">
          <span class="label">Статус</span>
          <select v-model="form.status">
            <option v-for="s in statuses" :key="s" :value="s">{{ ROUTE_STATUS_LABEL[s] }}</option>
          </select>
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
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
}
input,
select {
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
