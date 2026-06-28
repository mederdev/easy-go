<script setup lang="ts">
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppModal from '@/components/AppModal.vue';
import StatusChip from '@/components/StatusChip.vue';
import { useDriversModel } from './model';

const {
  drivers,
  loading,
  error,
  load,
  selected,
  driverFlights,
  flightsLoading,
  pwOpen,
  pwValue,
  pwSaving,
  pwError,
  pwSuccess,
  openDriver,
  closeDriver,
  openPw,
  savePassword,
  statusSaving,
  statusError,
  toggleActive,
  initials,
  carLabel,
  flightRoute,
  flightDate,
  flightCar,
  FLIGHT_STATUS_LABEL,
} = useDriversModel();
</script>

<template>
  <div>
    <StateBlock :loading="loading" :error="error" @retry="load">
      <EmptyState
        v-if="drivers.length === 0"
        icon="person"
        title="Водителей нет"
        description="Добавьте первого водителя в разделе «Автопарк»."
      />
      <div v-else class="table">
        <div class="row head-row">
          <span>Водитель</span>
          <span>Телефон</span>
          <span>Стаж</span>
          <span>Автомобиль</span>
          <span>Статус</span>
          <span>Доступ</span>
        </div>
        <div v-for="d in drivers" :key="d.id" class="row data-row" @click="openDriver(d)">
          <span class="name-cell">
            <span class="avatar">{{ initials(d.name) }}</span>
            <span class="strong">{{ d.name }}</span>
          </span>
          <span class="muted">{{ d.phone }}</span>
          <span class="muted">{{ d.experience ?? '—' }}</span>
          <span class="muted">{{ carLabel(d) }}</span>
          <span>
            <span class="status-chip" :class="(d as any).isActive ? 'status--active' : 'status--inactive'">
              {{ (d as any).isActive ? 'Активен' : 'Не активен' }}
            </span>
          </span>
          <span>
            <span class="access-chip" :class="(d as any).passwordHash ? 'access--on' : 'access--off'">
              {{ (d as any).passwordHash ? 'Пароль задан' : 'Нет пароля' }}
            </span>
          </span>
        </div>
      </div>
    </StateBlock>

    <!-- Driver detail modal -->
    <AppModal
      :open="!!selected"
      :title="selected?.name ?? ''"
      subtitle="Профиль водителя"
      @close="closeDriver"
    >
      <template v-if="selected">
        <div class="section">
          <div class="meta-row"><span class="meta-label">Телефон</span><span>{{ selected.phone }}</span></div>
          <div class="meta-row"><span class="meta-label">Стаж</span><span>{{ selected.experience ?? '—' }}</span></div>
          <div class="meta-row"><span class="meta-label">Автомобиль</span><span>{{ carLabel(selected) }}</span></div>
          <div class="meta-row">
            <span class="meta-label">Статус</span>
            <div>
              <div class="status-toggle-row">
                <span class="status-chip" :class="(selected as any).isActive ? 'status--active' : 'status--inactive'">
                  {{ (selected as any).isActive ? 'Активен' : 'Не активен' }}
                </span>
                <button
                  class="btn-outline btn-sm"
                  :disabled="statusSaving"
                  type="button"
                  @click="toggleActive"
                >
                  <span class="material-symbols-outlined">{{ (selected as any).isActive ? 'toggle_on' : 'toggle_off' }}</span>
                  {{ (selected as any).isActive ? 'Деактивировать' : 'Активировать' }}
                </button>
              </div>
              <div v-if="statusError" class="status-error">{{ statusError }}</div>
            </div>
          </div>
          <div class="meta-row">
            <span class="meta-label">Доступ к приложению</span>
            <span>
              <span class="access-chip" :class="(selected as any).passwordHash ? 'access--on' : 'access--off'">
                {{ (selected as any).passwordHash ? 'Пароль задан' : 'Нет пароля' }}
              </span>
            </span>
          </div>
          <div v-if="(selected as any).passwordRaw" class="meta-row">
            <span class="meta-label">Пароль</span>
            <span class="pw-reveal">{{ (selected as any).passwordRaw }}</span>
          </div>
        </div>

        <!-- Password section -->
        <div class="section">
          <div class="section-head">
            <div class="section-title">Пароль для входа</div>
            <button class="btn-outline" type="button" @click="openPw">
              <span class="material-symbols-outlined">key</span>
              {{ (selected as any).passwordHash ? 'Изменить пароль' : 'Задать пароль' }}
            </button>
          </div>
          <div v-if="pwOpen" class="pw-form">
            <input
              v-model="pwValue"
              class="pw-input"
              type="password"
              placeholder="Новый пароль (мин. 6 символов)"
              autocomplete="new-password"
            />
            <div v-if="pwError" class="pw-error">{{ pwError }}</div>
            <div v-if="pwSuccess" class="pw-ok">Пароль успешно сохранён</div>
            <button class="btn-primary" :disabled="pwValue.length < 6 || pwSaving" type="button" @click="savePassword">
              {{ pwSaving ? 'Сохраняем…' : 'Сохранить пароль' }}
            </button>
          </div>
        </div>

        <!-- Flight history -->
        <div class="section">
          <div class="section-title">История рейсов</div>
          <div v-if="flightsLoading" class="empty-text">Загружаем…</div>
          <div v-else-if="driverFlights.length === 0" class="empty-text">Рейсов не найдено</div>
          <div v-else class="flight-table">
            <div class="flight-row flight-head">
              <span>Дата</span>
              <span>Маршрут</span>
              <span>Авто</span>
              <span>Мест</span>
              <span>Статус</span>
            </div>
            <div v-for="f in driverFlights" :key="f.id" class="flight-row">
              <span class="muted">{{ flightDate(f) }}</span>
              <span>{{ flightRoute(f) }}</span>
              <span class="muted">{{ flightCar(f) }}</span>
              <span class="muted">{{ f.seatsTaken }}/{{ f.seatsTotal }}</span>
              <StatusChip kind="flight" :status="f.status" />
            </div>
          </div>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.table { background: #fff; border-radius: 16px; border: 1px solid #e7e9e5; overflow: hidden; }
.row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 2fr 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f1ee;
}
.head-row { font: 700 11px var(--eg-font); color: #9fa59a; text-transform: uppercase; letter-spacing: .06em; background: #fafafa; }
.data-row { cursor: pointer; transition: background .12s; }
.data-row:hover { background: #f7f8f5; }
.data-row:last-child { border-bottom: none; }
.name-cell { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%; background: var(--eg-ink);
  color: var(--eg-brand-bright); font: 800 13px var(--eg-font); flex: none;
  display: flex; align-items: center; justify-content: center;
}
.strong { font: 700 14px var(--eg-font); color: var(--eg-ink); }
.muted { font: 500 13px var(--eg-font); color: var(--eg-hint); }
.access-chip {
  display: inline-block; padding: 3px 10px; border-radius: 20px; font: 700 11px var(--eg-font);
}
.access--on { background: #EEF6E6; color: #3E7C12; }
.access--off { background: #FFF3E5; color: #B05000; }
.status-chip {
  display: inline-block; padding: 3px 10px; border-radius: 20px; font: 700 11px var(--eg-font);
}
.status--active { background: #EEF6E6; color: #3E7C12; }
.status--inactive { background: #F5F5F5; color: #888; }
.status-toggle-row { display: flex; align-items: center; gap: 10px; }
.btn-sm { height: 30px; padding: 0 10px; font-size: 12px; }
.btn-sm .material-symbols-outlined { font-size: 16px; }
.status-error { margin-top: 6px; font: 500 12px var(--eg-font); color: #C0492E; }

/* Modal internals */
.section { padding: 16px 0; border-bottom: 1px solid #f0f1ee; }
.section:last-child { border-bottom: none; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.section-title { font: 700 13px var(--eg-font); color: #9fa59a; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 12px; }
.meta-row { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; font: 500 14px var(--eg-font); }
.meta-label { width: 160px; flex: none; color: var(--eg-hint); }
.btn-outline {
  display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
  border: 1px solid var(--eg-border); border-radius: 10px; background: #fff;
  font: 700 13px var(--eg-font); cursor: pointer; color: var(--eg-ink);
}
.btn-outline .material-symbols-outlined { font-size: 18px; }
.pw-form { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.pw-input {
  height: 44px; padding: 0 12px; border: 1px solid #e2e5df; border-radius: 11px;
  font: 500 14px var(--eg-font); outline: none;
}
.pw-input:focus { border-color: var(--eg-brand); }
.pw-error { font: 500 12px var(--eg-font); color: #C0492E; }
.pw-ok { font: 500 12px var(--eg-font); color: #3E7C12; }
.btn-primary {
  height: 42px; border: none; border-radius: 11px; background: var(--eg-brand);
  color: #fff; font: 700 14px var(--eg-font); cursor: pointer;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.empty-text { font: 500 13px var(--eg-font); color: var(--eg-hint); padding: 8px 0; }
.pw-reveal {
  font: 700 14px var(--eg-font); letter-spacing: .04em;
  background: #f5f6f3; border: 1px solid #e2e5df; border-radius: 8px;
  padding: 4px 10px; color: var(--eg-ink); font-family: monospace;
}
.flight-table { overflow-x: auto; }
.flight-row {
  display: grid; grid-template-columns: 1fr 1.5fr 1.5fr .7fr 1fr;
  gap: 10px; align-items: center; padding: 10px 0;
  border-bottom: 1px solid #f0f1ee; font: 500 13px var(--eg-font);
}
.flight-head { font: 700 11px var(--eg-font); color: #9fa59a; text-transform: uppercase; letter-spacing: .06em; }
.flight-row:last-child { border-bottom: none; }
</style>
