<script setup lang="ts">
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useClientsModel } from './model';

const {
  loading,
  error,
  items,
  total,
  search,
  pageStart,
  pageEnd,
  canPrev,
  canNext,
  load,
  prev,
  next,
  money,
  dateLabel,
  initials,
} = useClientsModel();
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="search">
        <span class="material-symbols-outlined">search</span>
        <input v-model="search" placeholder="Поиск клиента по имени или телефону…" />
      </div>
    </div>

    <StateBlock :loading="loading" :error="error" @retry="load">
      <div class="table">
        <div class="row head-row">
          <span>Клиент</span>
          <span>Телефон</span>
          <span>WhatsApp</span>
          <span>Поездок</span>
          <span>Сумма заказов</span>
          <span>Последняя</span>
        </div>
        <EmptyState
          v-if="items.length === 0"
          icon="groups"
          title="Клиентов не найдено"
          description="Измените поисковый запрос."
        />
        <div v-for="c in items" :key="c.id" class="row data-row">
          <span class="name-cell">
            <span class="avatar">{{ initials(c.name) }}</span>
            <span class="strong">{{ c.name }}</span>
          </span>
          <span class="muted">{{ c.phone }}</span>
          <span>
            <span
              class="material-symbols-outlined wa"
              :class="{ off: !c.whatsapp }"
            >{{ c.whatsapp ? 'check_circle' : 'cancel' }}</span>
          </span>
          <span class="strong">{{ c.tripsCount }}</span>
          <span class="total">{{ money(c.totalSum) }}</span>
          <span class="muted">{{ dateLabel(c.lastBookingAt) }}</span>
        </div>
      </div>

      <div v-if="items.length" class="pager">
        <span class="page-info">{{ pageStart }}–{{ pageEnd }} из {{ total }}</span>
        <div class="page-buttons">
          <button type="button" :disabled="!canPrev" @click="prev">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <button type="button" :disabled="!canNext" @click="next">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </StateBlock>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 16px;
  display: flex;
}
.search {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 40px;
  min-width: 320px;
  background: #fff;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  padding: 0 14px;
}
.search .material-symbols-outlined {
  font-size: 20px;
  color: #a7aca2;
}
.search input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font: 500 13px var(--eg-font);
}
.table {
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  overflow: hidden;
}
.row {
  display: grid;
  grid-template-columns: 1.6fr 1.3fr 90px 90px 1fr 130px;
  align-items: center;
  font: 600 13px var(--eg-font);
  padding: 14px 20px;
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
.total {
  font-weight: 800;
}
.name-cell {
  display: flex;
  align-items: center;
  gap: 11px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--eg-brand-light);
  color: var(--eg-brand-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 800 12px var(--eg-font);
  flex: none;
}
.wa {
  font-size: 19px;
  color: #1fae54;
}
.wa.off {
  color: #c4c8c0;
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}
.page-info {
  font: 600 13px var(--eg-font);
  color: var(--eg-muted);
}
.page-buttons {
  display: flex;
  gap: 8px;
}
.page-buttons button {
  width: 38px;
  height: 38px;
  border: 1px solid var(--eg-border);
  background: #fff;
  border-radius: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-buttons button:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
