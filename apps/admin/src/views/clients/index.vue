<script setup lang="ts">
import StateBlock from '@/components/StateBlock.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppModal from '@/components/AppModal.vue';
import StatusChip from '@/components/StatusChip.vue';
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
  dateTimeLabel,
  initials,
  modalOpen,
  modalClient,
  modalLoading,
  modalError,
  selectClient,
  closeModal,
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
        <div v-for="c in items" :key="c.id" class="row data-row clickable" @click="selectClient(c.id)">
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

      <!-- Mobile cards (hidden on desktop) -->
      <div class="m-cards">
        <EmptyState
          v-if="items.length === 0"
          icon="groups"
          title="Клиентов не найдено"
          description="Измените поисковый запрос."
        />
        <div
          v-for="c in items"
          :key="c.id"
          class="m-card"
          @click="selectClient(c.id)"
        >
          <div class="m-card-top">
            <div class="m-person">
              <span class="avatar">{{ initials(c.name) }}</span>
              <div class="m-person-meta">
                <div class="m-name">{{ c.name }}</div>
                <div class="m-phone">{{ c.phone }}</div>
              </div>
            </div>
            <span
              class="material-symbols-outlined wa"
              :class="{ off: !c.whatsapp }"
            >{{ c.whatsapp ? 'check_circle' : 'cancel' }}</span>
          </div>
          <div class="m-meta">
            <div class="m-meta-item">
              <span class="m-cap">Поездок</span>
              <span class="m-val">{{ c.tripsCount }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Сумма заказов</span>
              <span class="m-val">{{ money(c.totalSum) }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Последняя</span>
              <span class="m-val">{{ dateLabel(c.lastBookingAt) }}</span>
            </div>
          </div>
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

    <AppModal
      :open="modalOpen"
      :title="modalClient ? modalClient.name : 'Клиент'"
      :subtitle="modalClient ? modalClient.phone : undefined"
      @close="closeModal"
    >
      <div v-if="modalLoading" class="modal-state">
        <span class="material-symbols-outlined spin">progress_activity</span>
      </div>
      <div v-else-if="modalError" class="modal-state error">{{ modalError }}</div>
      <template v-else-if="modalClient">
        <div class="client-stats">
          <div class="stat-card">
            <span class="stat-label">Поездок</span>
            <span class="stat-value">{{ modalClient.tripsCount }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Сумма заказов</span>
            <span class="stat-value">{{ money(modalClient.totalSum) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Зарегистрирован</span>
            <span class="stat-value">{{ dateLabel(modalClient.createdAt) }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">WhatsApp</span>
            <span class="stat-value wa-val" :class="{ off: !modalClient.whatsapp }">
              <span class="material-symbols-outlined">{{ modalClient.whatsapp ? 'check_circle' : 'cancel' }}</span>
            </span>
          </div>
        </div>

        <div class="section-title">История поездок</div>

        <div v-if="modalClient.bookings.length === 0" class="no-bookings">
          <span class="material-symbols-outlined">inbox</span>
          Поездок нет
        </div>
        <div v-else class="booking-list">
          <div v-for="b in modalClient.bookings" :key="b.id" class="booking-row">
            <div class="booking-left">
              <span class="booking-code">{{ b.code }}</span>
              <span class="booking-route">{{ b.flight?.route ? `${b.flight.route.fromCity} → ${b.flight.route.toCity}` : '—' }}</span>
              <span class="booking-date">{{ b.flight ? dateTimeLabel(b.flight.departAt) : '—' }}</span>
            </div>
            <div class="booking-right">
              <span class="booking-pax">{{ b.pax }} чел.</span>
              <span class="booking-total">{{ money(b.total) }}</span>
              <StatusChip kind="booking" :status="b.status" />
            </div>
          </div>
        </div>
      </template>
    </AppModal>
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
.clickable {
  cursor: pointer;
  transition: background 0.12s;
}
.clickable:hover {
  background: #f8faf6;
}
.modal-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  color: var(--eg-muted);
}
.modal-state.error {
  color: #d63c3c;
  font: 500 13px var(--eg-font);
}
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin 0.9s linear infinite; font-size: 28px; }
.client-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 22px;
}
.stat-card {
  background: #f8faf6;
  border: 1px solid var(--eg-line);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-label {
  font: 500 11px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.stat-value {
  font: 800 15px var(--eg-font);
  color: var(--eg-ink);
}
.wa-val .material-symbols-outlined {
  font-size: 18px;
  color: #1fae54;
}
.wa-val.off .material-symbols-outlined {
  color: #c4c8c0;
}
.section-title {
  font: 700 11px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 10px;
}
.no-bookings {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 500 13px var(--eg-font);
  color: var(--eg-muted);
  padding: 16px 0;
}
.no-bookings .material-symbols-outlined { font-size: 20px; }
.booking-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--eg-line);
  border-radius: 12px;
  overflow: hidden;
}
.booking-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f4f5f2;
  gap: 12px;
}
.booking-row:last-child { border-bottom: none; }
.booking-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.booking-code {
  font: 700 13px var(--eg-font);
  color: var(--eg-brand);
}
.booking-route {
  font: 600 13px var(--eg-font);
}
.booking-date {
  font: 500 12px var(--eg-font);
  color: var(--eg-muted);
}
.booking-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: none;
}
.booking-pax {
  font: 500 12px var(--eg-font);
  color: var(--eg-muted);
}
.booking-total {
  font: 800 13px var(--eg-font);
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

@media (max-width: 720px) {
  .toolbar {
    align-items: stretch;
  }
  .search {
    margin-left: 0;
    min-width: 0;
    width: 100%;
  }
  .table {
    display: none;
  }
  .m-cards {
    display: flex;
  }
  /* Booking history in the client modal stacks into list items. */
  .booking-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .booking-right {
    width: 100%;
    justify-content: space-between;
  }
}
@media (max-width: 480px) {
  .client-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
