<script setup lang="ts">
import StateBlock from '@/components/StateBlock.vue';
import AppModal from '@/components/AppModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useServiceAddonsModel } from './model';

const {
  config,
  loading,
  error,
  addons,
  load,
  modalOpen,
  editing,
  saving,
  formError,
  form,
  openEdit,
  closeModal,
  save,
  remove,
  money,
} = useServiceAddonsModel();
</script>

<template>
  <div>
    <div class="hint-bar">
      <span class="material-symbols-outlined">lightbulb</span>
      <span>Каталог платных услуг. Оператор добавляет их в бронь, стоимость входит в сумму заказа.</span>
    </div>

    <StateBlock :loading="loading" :error="error" @retry="load">
      <div class="table">
        <div class="row head-row">
          <span>Услуга</span>
          <span>Цена</span>
          <span></span>
        </div>
        <EmptyState
          v-if="addons.length === 0"
          icon="storefront"
          title="Услуг пока нет"
          description="Добавьте первую платную услугу."
        />
        <div v-for="a in addons" :key="a.id" class="row data-row">
          <span class="strong">{{ a.name }}</span>
          <span class="strong">{{ money(a.price) }}</span>
          <span class="actions">
            <button type="button" class="icon-btn" title="Изменить" @click="openEdit(a)">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button type="button" class="icon-btn danger" title="Удалить" @click="remove(a)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </span>
        </div>
      </div>

      <!-- Mobile cards (hidden on desktop) -->
      <div class="m-cards">
        <EmptyState
          v-if="addons.length === 0"
          icon="storefront"
          title="Услуг пока нет"
          description="Добавьте первую платную услугу."
        />
        <div v-for="a in addons" :key="a.id" class="m-card">
          <div class="m-card-top">
            <div class="m-title">{{ a.name }}</div>
            <span class="m-price">{{ money(a.price) }}</span>
          </div>
          <div class="m-actions">
            <button type="button" class="icon-btn edit" @click="openEdit(a)">
              <span class="material-symbols-outlined">edit</span>
              Изменить
            </button>
            <button type="button" class="icon-btn danger" title="Удалить" @click="remove(a)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    </StateBlock>

    <AppModal
      :open="modalOpen"
      :title="editing ? 'Редактировать услугу' : 'Новая услуга'"
      subtitle="Название и цена доп. услуги"
      @close="closeModal"
    >
      <form class="form" @submit.prevent="save">
        <label class="field">
          <span class="label">Название</span>
          <input v-model="form.name" placeholder="Детское кресло" />
        </label>
        <label class="field">
          <span class="label">Цена ({{ config.currency }})</span>
          <input v-model="form.priceMajor" inputmode="decimal" placeholder="500" />
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
  grid-template-columns: 2fr 1fr 90px;
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
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
}
input {
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  font: 600 14px var(--eg-font);
  outline: none;
  background: #fff;
}
input:focus {
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
.m-price {
  font: 700 14px var(--eg-font);
  color: var(--eg-brand-dark);
  flex-shrink: 0;
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
  .table {
    display: none;
  }
  .m-cards {
    display: flex;
  }
}
</style>
