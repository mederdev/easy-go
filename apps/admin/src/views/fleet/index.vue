<script setup lang="ts">
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import AppModal from '@/components/AppModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useFleetModel } from './model';

const {
  loading,
  error,
  cars,
  drivers,
  load,
  modalOpen,
  editing,
  saving,
  formError,
  cities,
  statuses,
  types,
  seatOptions,
  onTypeChange,
  form,
  openEdit,
  closeModal,
  save,
  driverName,
  CAR_STATUS_LABEL,
  CAR_TYPE_LABEL,
} = useFleetModel();
</script>

<template>
  <div>
    <StateBlock :loading="loading" :error="error" @retry="load">
      <EmptyState
        v-if="cars.length === 0"
        icon="directions_car"
        title="Автопарк пуст"
        description="Добавьте первый автомобиль."
      />
      <div v-else class="grid">
        <div v-for="c in cars" :key="c.id" class="card">
          <div class="thumb material-symbols-outlined">directions_car</div>
          <div class="body">
            <div class="top">
              <div class="model">{{ c.model }}</div>
              <StatusChip kind="car" :status="c.status" />
            </div>
            <div class="plate">{{ c.plate }}</div>
            <div class="facts">
              <div>
                <div class="cap">Тип</div>
                <div class="fact">{{ CAR_TYPE_LABEL[c.type] }}</div>
              </div>
              <div>
                <div class="cap">Водитель</div>
                <div class="fact">{{ driverName(c) }}</div>
              </div>
              <div>
                <div class="cap">Мест</div>
                <div class="fact">{{ c.seats }}</div>
              </div>
              <div>
                <div class="cap">Рейсов · мес</div>
                <div class="fact">{{ c.tripsMonth }}</div>
              </div>
            </div>
            <button type="button" class="edit" @click="openEdit(c)">
              <span class="material-symbols-outlined">edit</span>
              Изменить
            </button>
          </div>
        </div>
      </div>
    </StateBlock>

    <AppModal
      :open="modalOpen"
      :title="editing ? 'Редактировать авто' : 'Новое авто'"
      subtitle="Транспорт, водитель и статус"
      @close="closeModal"
    >
      <form class="form" @submit.prevent="save">
        <label class="field">
          <span class="label">Модель</span>
          <input v-model="form.model" placeholder="KIA Carnival" />
        </label>
        <label class="field">
          <span class="label">Госномер</span>
          <input v-model="form.plate" placeholder="01 KG 777 ABC" />
        </label>
        <div class="two">
          <label class="field">
            <span class="label">Тип машины</span>
            <select v-model="form.type" @change="onTypeChange">
              <option v-for="t in types" :key="t" :value="t">{{ CAR_TYPE_LABEL[t] }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Мест</span>
            <select v-model.number="form.seats">
              <option v-for="n in seatOptions" :key="n" :value="n">{{ n }}</option>
            </select>
          </label>
        </div>
        <label class="field">
          <span class="label">Водитель</span>
          <select v-model="form.driverId">
            <option value="">— без водителя</option>
            <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </label>
        <div class="two">
          <label class="field">
            <span class="label">Статус</span>
            <select v-model="form.status">
              <option v-for="s in statuses" :key="s" :value="s">{{ CAR_STATUS_LABEL[s] }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Город</span>
            <select v-model="form.locationCity">
              <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
        </div>
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
  display: flex;
  gap: 16px;
}
.thumb {
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: var(--eg-ink);
  color: var(--eg-brand-bright);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  font-size: 32px;
}
.body {
  flex: 1;
  min-width: 0;
}
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.model {
  font: 800 16px var(--eg-font);
}
.plate {
  font: 700 13px var(--eg-font);
  color: var(--eg-brand);
  margin-top: 3px;
}
.facts {
  display: flex;
  gap: 18px;
  margin-top: 12px;
}
.cap {
  font: 600 10px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
}
.fact {
  font: 700 13px var(--eg-font);
}
.edit {
  margin-top: 14px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--eg-border);
  background: #fff;
  border-radius: 10px;
  font: 700 12px var(--eg-font);
  color: var(--eg-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.edit .material-symbols-outlined {
  font-size: 17px;
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

@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .two {
    grid-template-columns: 1fr;
  }
}
</style>
