<script setup lang="ts">
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppModal from '@/components/AppModal.vue';
import StatusChip from '@/components/StatusChip.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { useAuthStore } from '@/stores/auth';
import { useDriversModel } from './model';

const auth = useAuthStore();

const {
  drivers,
  loading,
  error,
  load,
  createOpen,
  createSaving,
  createError,
  createData,
  openCreate,
  closeCreate,
  saveDriver,
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
  deleteConfirm,
  deleting,
  deleteError,
  deleteDriver,
  cancelDelete,
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
        description="Нажмите «Добавить водителя», чтобы создать первого."
      >
        <button type="button" class="btn-primary empty-cta" @click="openCreate">
          <span class="material-symbols-outlined">add</span>
          Добавить водителя
        </button>
      </EmptyState>
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

      <!-- Mobile cards (hidden on desktop) -->
      <div class="m-cards">
        <div
          v-for="d in drivers"
          :key="d.id"
          class="m-card"
          @click="openDriver(d)"
        >
          <div class="m-card-top">
            <div class="m-person">
              <span class="avatar">{{ initials(d.name) }}</span>
              <div class="m-person-meta">
                <div class="m-name">{{ d.name }}</div>
                <div class="m-phone">{{ d.phone }}</div>
              </div>
            </div>
            <span
              class="status-chip"
              :class="(d as any).isActive ? 'status--active' : 'status--inactive'"
            >
              {{ (d as any).isActive ? 'Активен' : 'Не активен' }}
            </span>
          </div>
          <div class="m-meta">
            <div class="m-meta-item">
              <span class="m-cap">Стаж</span>
              <span class="m-val">{{ d.experience ?? '—' }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Автомобиль</span>
              <span class="m-val">{{ carLabel(d) }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Доступ</span>
              <span
                class="access-chip"
                :class="(d as any).passwordHash ? 'access--on' : 'access--off'"
              >
                {{ (d as any).passwordHash ? 'Пароль задан' : 'Нет пароля' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </StateBlock>

    <!-- Create driver modal -->
    <AppModal
      :open="createOpen"
      title="Новый водитель"
      subtitle="Контакты и доступ к приложению"
      @close="closeCreate"
    >
      <form class="create-form" @submit.prevent="saveDriver">
        <label class="field">
          <span class="label">Имя</span>
          <input v-model="createData.name" placeholder="Азамат Бекову" />
        </label>
        <label class="field">
          <span class="label">Телефон</span>
          <input v-model="createData.phone" inputmode="tel" placeholder="+996 700 000 000" />
        </label>
        <label class="field">
          <span class="label">Стаж (необязательно)</span>
          <input v-model="createData.experience" placeholder="Например: 8 лет" />
        </label>
        <label class="field">
          <span class="label">Пароль для входа (необязательно)</span>
          <PasswordInput
            v-model="createData.password"
            variant="create"
            placeholder="Мин. 6 символов — доступ к приложению водителя"
            autocomplete="new-password"
          />
        </label>
        <div v-if="createError" class="form-error">{{ createError }}</div>
      </form>

      <template #footer>
        <button type="button" class="btn-outline" @click="closeCreate">Отмена</button>
        <button type="button" class="btn-primary btn-save" :disabled="createSaving" @click="saveDriver">
          {{ createSaving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </template>
    </AppModal>

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
            <PasswordInput
              v-model="pwValue"
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

          <!-- Mobile cards (hidden on desktop) -->
          <div v-if="driverFlights.length" class="m-flights">
            <div v-for="f in driverFlights" :key="f.id" class="m-flight">
              <div class="m-flight-top">
                <span class="m-flight-route">{{ flightRoute(f) }}</span>
                <StatusChip kind="flight" :status="f.status" />
              </div>
              <div class="m-flight-meta">
                <span>{{ flightDate(f) }}</span>
                <span class="dot">·</span>
                <span>{{ flightCar(f) }}</span>
                <span class="dot">·</span>
                <span>{{ f.seatsTaken }}/{{ f.seatsTotal }} мест</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Deletion (admin/owner) -->
        <div v-if="auth.isAdmin" class="section">
          <div v-if="!deleteConfirm" class="danger-row">
            <button class="btn-danger" type="button" :disabled="deleting" @click="deleteDriver">
              <span class="material-symbols-outlined">delete</span>
              Удалить водителя
            </button>
          </div>
          <div v-else class="danger-confirm">
            <div class="danger-text">Водитель будет удалён безвозвратно. Его машины останутся без водителя.</div>
            <div class="danger-actions">
              <button class="btn-danger" type="button" :disabled="deleting" @click="deleteDriver">
                {{ deleting ? 'Удаляем…' : 'Да, удалить' }}
              </button>
              <button class="btn-outline" type="button" :disabled="deleting" @click="cancelDelete">Отмена</button>
            </div>
          </div>
          <div v-if="deleteError" class="danger-error">{{ deleteError }}</div>
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

/* Create-driver form (styled to match the fleet modal) */
.create-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font: 600 12px var(--eg-font); color: var(--eg-hint); }
.create-form input {
  height: 46px; padding: 0 12px; border: 1px solid var(--eg-border); border-radius: 11px;
  font: 600 14px var(--eg-font); outline: none; background: #fff;
}
.create-form input:focus { border-color: var(--eg-brand); }
.form-error {
  background: #fbedea; color: #c0492e; font: 600 13px var(--eg-font);
  padding: 10px 12px; border-radius: 10px;
}
.btn-save { padding: 0 20px; }

/* Danger zone (delete driver) */
.btn-danger {
  display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px;
  border: 1px solid #eccfc7; border-radius: 10px; background: #fff;
  font: 700 13px var(--eg-font); cursor: pointer; color: #c0492e;
}
.btn-danger .material-symbols-outlined { font-size: 18px; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.danger-confirm { display: flex; flex-direction: column; gap: 10px; }
.danger-text { font: 500 13px var(--eg-font); color: var(--eg-muted); }
.danger-actions { display: flex; gap: 10px; }
.danger-error {
  margin-top: 10px; background: #fbedea; color: #c0492e;
  font: 600 13px var(--eg-font); padding: 10px 12px; border-radius: 10px;
}
.empty-cta {
  margin-top: 12px; padding: 0 18px;
  display: inline-flex; align-items: center; gap: 6px;
}
.empty-cta .material-symbols-outlined { font-size: 18px; color: #fff; margin: 0; }
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

/* Flight history as cards (mobile only) */
.m-flights {
  display: none;
  flex-direction: column;
  gap: 10px;
}
.m-flight {
  border: 1px solid var(--eg-line);
  border-radius: 12px;
  padding: 12px 14px;
}
.m-flight-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.m-flight-route {
  font: 700 14px var(--eg-font);
  min-width: 0;
}
.m-flight-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font: 500 13px var(--eg-font);
  color: var(--eg-muted);
}
.m-flight-meta .dot {
  color: #c4c8c0;
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
  cursor: pointer;
}
.m-card:active {
  background: #fafbf9;
}
.m-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.m-person {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}
.m-person-meta {
  min-width: 0;
}
.m-name {
  font: 800 15px var(--eg-font);
}
.m-phone {
  font: 600 13px var(--eg-font);
  color: var(--eg-hint);
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
  align-items: flex-start;
  gap: 4px;
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

@media (max-width: 720px) {
  .table {
    display: none;
  }
  .m-cards {
    display: flex;
  }
  /* Driver-detail flight history switches to cards too. */
  .flight-table {
    display: none;
  }
  .m-flights {
    display: flex;
  }
  /* Let detail rows wrap so the status toggle can't force sideways scroll. */
  .meta-row {
    flex-wrap: wrap;
  }
  .meta-label {
    width: 130px;
  }
  .status-toggle-row {
    flex-wrap: wrap;
  }
}
</style>
