<script setup lang="ts">
import StatusChip from '@/components/StatusChip.vue';
import StateBlock from '@/components/StateBlock.vue';
import FilterChip from '@/components/FilterChip.vue';
import DatePicker from '@/components/DatePicker.vue';
import AppDrawer from '@/components/AppDrawer.vue';
import AppModal from '@/components/AppModal.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useBookingsModel } from './model';

const {
  filters,
  activeFilter,
  search,
  dateFrom,
  dateTo,
  setDateFrom,
  setDateTo,
  clearDates,
  loading,
  error,
  items,
  total,
  pageStart,
  pageEnd,
  canPrev,
  canNext,
  load,
  setFilter,
  prev,
  next,
  selected,
  statusBusy,
  statusError,
  nextStatuses,
  open,
  closeDrawer,
  changeStatus,
  waLink,
  paymentForm,
  paymentBusy,
  paymentError,
  savePayment,
  setPaid,
  createOpen,
  creating,
  createError,
  bookableFlights,
  createStatuses,
  createForm,
  createTotal,
  closeCreate,
  flightOptionLabel,
  submitCreate,
  clientSearch,
  clientSuggestions,
  clientSearching,
  clientSearchOpen,
  selectedClient,
  onClientSearchInput,
  pickClientSuggestion,
  clearSelectedClient,
  blurClientSearch,
  tab,
  setTab,
  customItems,
  customTotal,
  customLoading,
  customError,
  customPageStart,
  customPageEnd,
  customCanPrev,
  customCanNext,
  loadCustom,
  customPrev,
  customNext,
  customRouteLabel,
  customSelected,
  openCustom,
  closeCustom,
  customWaLink,
  customNextStatuses,
  customStatusBusy,
  customStatusError,
  changeCustomStatus,
  approveOpen,
  approving,
  approveError,
  approveRoutes,
  approveCars,
  approveForm,
  approveTotal,
  openApprove,
  closeApprove,
  submitApprove,
  flightRouteOptionLabel,
  money,
  bookingRouteLabel,
  dateLabel,
  dateTimeLabel,
  initials,
  paxLabel,
  BOOKING_STATUS_LABEL,
  CAR_TYPE_LABEL,
  APPLICATION_STATUS_LABEL,
} = useBookingsModel();
</script>

<template>
  <div>
    <div class="tabs">
      <button type="button" class="tab" :class="{ active: tab === 'bookings' }" @click="setTab('bookings')">
        Бронирования
      </button>
      <button type="button" class="tab" :class="{ active: tab === 'custom' }" @click="setTab('custom')">
        Заявки клиентов
        <span v-if="customTotal" class="tab-count">{{ customTotal }}</span>
      </button>
    </div>

    <template v-if="tab === 'bookings'">
    <div class="toolbar">
      <div class="chips">
        <FilterChip
          v-for="f in filters"
          :key="f.value"
          :label="f.label"
          :active="activeFilter === f.value"
          @click="setFilter(f.value)"
        />
      </div>
      <div class="search">
        <span class="material-symbols-outlined">search</span>
        <input v-model="search" placeholder="Поиск по клиенту, телефону, №…" />
      </div>
    </div>

    <div class="date-bar">
      <span class="date-bar-label">Дата рейса</span>
      <DatePicker
        :model-value="dateFrom"
        :max="dateTo || undefined"
        placeholder="От"
        @update:model-value="setDateFrom"
      />
      <span class="date-bar-dash">—</span>
      <DatePicker
        :model-value="dateTo"
        :min="dateFrom || undefined"
        placeholder="До"
        @update:model-value="setDateTo"
      />
      <button v-if="dateFrom || dateTo" type="button" class="date-reset" @click="clearDates">
        Сбросить
      </button>
    </div>

    <StateBlock :loading="loading" :error="error" @retry="load">
      <div class="table">
        <div class="row head-row">
          <span>№</span>
          <span>Клиент</span>
          <span>Маршрут</span>
          <span>Дата · время</span>
          <span>Пасс.</span>
          <span>Сумма</span>
          <span>Статус</span>
          <span></span>
        </div>
        <EmptyState
          v-if="items.length === 0"
          icon="receipt_long"
          title="Заявок не найдено"
          description="Измените фильтр или поисковый запрос."
        />
        <div v-for="b in items" :key="b.id" class="row data-row" @click="open(b)">
          <span class="muted strong">{{ b.code }}</span>
          <span class="client">
            <span class="strong block">{{ b.client?.name ?? '—' }}</span>
            <span class="sub">{{ b.client?.phone ?? '' }}</span>
          </span>
          <span class="strong">{{ bookingRouteLabel(b) }}</span>
          <span class="muted">{{ dateTimeLabel(b.flight?.departAt) }}</span>
          <span class="strong">{{ b.pax }}</span>
          <span class="strong total">{{ money(b.total) }}</span>
          <span class="status-cell">
            <StatusChip kind="booking" :status="b.status" />
            <StatusChip kind="payment" :status="b.paymentStatus" />
          </span>
          <span class="chevron material-symbols-outlined">chevron_right</span>
        </div>
      </div>

      <!-- Mobile cards (hidden on desktop) -->
      <div class="m-cards">
        <EmptyState
          v-if="items.length === 0"
          icon="receipt_long"
          title="Заявок не найдено"
          description="Измените фильтр или поисковый запрос."
        />
        <div v-for="b in items" :key="b.id" class="m-card" @click="open(b)">
          <div class="m-card-top">
            <div class="m-head-left">
              <div class="m-code">{{ b.code }}</div>
              <div class="m-title">{{ bookingRouteLabel(b) }}</div>
            </div>
            <div class="m-chips">
              <StatusChip kind="booking" :status="b.status" />
              <StatusChip kind="payment" :status="b.paymentStatus" />
            </div>
          </div>
          <div class="m-client">
            <span class="m-name">{{ b.client?.name ?? '—' }}</span>
            <span class="m-phone">{{ b.client?.phone ?? '' }}</span>
          </div>
          <div class="m-meta">
            <div class="m-meta-item">
              <span class="m-cap">Дата · время</span>
              <span class="m-val">{{ dateTimeLabel(b.flight?.departAt) }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Пасс.</span>
              <span class="m-val">{{ b.pax }}</span>
            </div>
            <div class="m-meta-item">
              <span class="m-cap">Сумма</span>
              <span class="m-val accent">{{ money(b.total) }}</span>
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

    <!-- Detail drawer -->
    <AppDrawer :open="!!selected" @close="closeDrawer">
      <template v-if="selected">
        <div class="drawer-head">
          <div>
            <div class="drawer-code">Бронирование {{ selected.code }}</div>
            <div class="drawer-route">{{ bookingRouteLabel(selected) }}</div>
          </div>
          <button class="drawer-close" type="button" @click="closeDrawer">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="drawer-body" data-scroll>
          <div class="chip-row">
            <StatusChip kind="booking" :status="selected.status" />
            <StatusChip kind="payment" :status="selected.paymentStatus" />
          </div>

          <div class="grid">
            <div>
              <div class="cap">Дата · время</div>
              <div class="val">{{ dateTimeLabel(selected.flight?.departAt) }}</div>
            </div>
            <div>
              <div class="cap">Пассажиров</div>
              <div class="val">{{ paxLabel(selected.pax) }}</div>
            </div>
            <div>
              <div class="cap">Сумма</div>
              <div class="val accent">{{ money(selected.total) }}</div>
            </div>
            <div>
              <div class="cap">Авто</div>
              <div class="val">{{ selected.flight?.car?.model ?? '—' }}</div>
            </div>
          </div>

          <div v-if="selected.comment" class="comment">
            <div class="cap">Комментарий</div>
            <div class="comment-text">{{ selected.comment }}</div>
          </div>

          <div class="divider" />

          <div class="section-title">Клиент</div>
          <div class="client-row">
            <span class="avatar">{{ initials(selected.client?.name) }}</span>
            <div>
              <div class="client-name">{{ selected.client?.name ?? '—' }}</div>
              <div class="client-phone">{{ selected.client?.phone ?? '' }}</div>
            </div>
          </div>
          <div v-if="selected.client" class="client-stats">
            <div>
              <div class="cap">Поездок</div>
              <div class="stat">{{ selected.client.tripsCount }}</div>
            </div>
            <div>
              <div class="cap">Сумма заказов</div>
              <div class="stat">{{ money(selected.client.totalSum) }}</div>
            </div>
          </div>

          <div class="divider" />

          <div class="section-title">Оплата</div>
          <div v-if="paymentError" class="status-error">{{ paymentError }}</div>
          <div class="pay-grid">
            <label class="field">
              <span class="label">Скидка</span>
              <input v-model.number="paymentForm.discount" type="number" min="0" inputmode="numeric" />
            </label>
            <label class="field">
              <span class="label">Предоплата</span>
              <input v-model.number="paymentForm.prepaid" type="number" min="0" inputmode="numeric" />
            </label>
          </div>
          <div class="pay-summary">
            <div class="pay-line">
              <span class="cap">Предоплата</span>
              <span class="val">{{ money(selected.prepaid) }}</span>
            </div>
            <div class="pay-line">
              <span class="cap">Остаток к оплате</span>
              <span class="val accent">{{ money(Math.max(0, selected.total - selected.prepaid)) }}</span>
            </div>
                        <div class="pay-line">
              <span class="cap">Итого</span>
              <span class="val">{{ money(selected.total) }}</span>
            </div>
          </div>
          <div class="pay-actions">
            <button type="button" class="status-btn" :disabled="paymentBusy" @click="savePayment">
              Сохранить
            </button>
            <button
              v-if="selected.paymentStatus !== 'PAID'"
              type="button"
              class="status-btn"
              :disabled="paymentBusy"
              @click="setPaid(true)"
            >
              Отметить оплаченным
            </button>
            <button
              v-else
              type="button"
              class="status-btn danger"
              :disabled="paymentBusy"
              @click="setPaid(false)"
            >
              Снять оплату
            </button>
          </div>

          <div class="divider" />

          <div class="section-title">Сменить статус</div>
          <div v-if="statusError" class="status-error">{{ statusError }}</div>
          <div class="status-actions">
            <template v-if="nextStatuses[selected.status].length">
              <button
                v-for="st in nextStatuses[selected.status]"
                :key="st"
                type="button"
                class="status-btn"
                :class="{ danger: st === 'CANCELLED' }"
                :disabled="statusBusy"
                @click="changeStatus(st)"
              >
                {{ BOOKING_STATUS_LABEL[st] }}
              </button>
            </template>
            <div v-else class="status-final">Заявка завершена — изменений нет.</div>
          </div>
        </div>

        <div class="drawer-footer">
          <a v-if="selected.client?.phone" class="wa" :href="waLink(selected)" target="_blank" rel="noopener">
            <span class="material-symbols-outlined">chat</span>
            WhatsApp
          </a>
          <span v-else class="wa wa--disabled">Нет номера телефона</span>
        </div>
      </template>
    </AppDrawer>

    <!-- Create booking -->
    <AppModal
      :open="createOpen"
      title="Новое бронирование"
      subtitle="Оператор оформляет заявку вручную"
      @close="closeCreate"
    >
      <form class="form" @submit.prevent="submitCreate">
        <label class="field">
          <span class="label">Рейс</span>
          <select v-model="createForm.flightId">
            <option v-if="bookableFlights.length === 0" value="">Нет открытых рейсов</option>
            <option v-for="f in bookableFlights" :key="f.id" :value="f.id">{{ flightOptionLabel(f) }}</option>
          </select>
        </label>
        <div class="field client-search-field">
          <span class="label">Выбрать из существующих <span class="opt">(необязательно)</span></span>
          <div v-if="selectedClient" class="client-chip">
            <span class="material-symbols-outlined chip-icon">person</span>
            <span class="chip-name">{{ selectedClient.name }}</span>
            <span class="chip-phone">{{ selectedClient.phone }}</span>
            <button type="button" class="chip-clear" @click="clearSelectedClient">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div v-else class="client-search-wrap">
            <span class="material-symbols-outlined cs-icon" :class="{ spinning: clientSearching }">{{ clientSearching ? 'progress_activity' : 'search' }}</span>
            <input
              v-model="clientSearch"
              class="cs-input"
              placeholder="Поиск по имени или телефону…"
              autocomplete="off"
              @input="onClientSearchInput"
              @blur="blurClientSearch"
            />
            <div v-if="clientSearchOpen" class="suggestions">
              <div
                v-for="c in clientSuggestions"
                :key="c.id"
                class="suggestion"
                @mousedown.prevent="pickClientSuggestion(c)"
              >
                <span class="sug-name">{{ c.name }}</span>
                <span class="sug-phone">{{ c.phone }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Имя клиента</span>
            <input v-model="createForm.name" :disabled="!!selectedClient" placeholder="Айгуль Сапарова" />
          </label>
          <label class="field">
            <span class="label">Телефон</span>
            <input v-model="createForm.phone" :disabled="!!selectedClient" placeholder="+996 700 000 000" />
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Пассажиров</span>
            <div class="stepper">
              <button type="button" @click="createForm.pax = Math.max(1, createForm.pax - 1)">−</button>
              <span class="stepper-val">{{ createForm.pax }}</span>
              <button type="button" @click="createForm.pax = createForm.pax + 1">+</button>
            </div>
          </label>
          <label class="field">
            <span class="label">Статус</span>
            <select v-model="createForm.status">
              <option v-for="s in createStatuses" :key="s" :value="s">{{ BOOKING_STATUS_LABEL[s] }}</option>
            </select>
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Скидка <span class="opt">(необязательно)</span></span>
            <input v-model.number="createForm.discount" type="number" min="0" inputmode="numeric" placeholder="0" />
          </label>
          <label class="field">
            <span class="label">Предоплата <span class="opt">(необязательно)</span></span>
            <input v-model.number="createForm.prepaid" type="number" min="0" inputmode="numeric" placeholder="0" />
          </label>
        </div>
        <label class="check">
          <input v-model="createForm.whatsapp" type="checkbox" />
          <span>Этот номер используется в WhatsApp</span>
        </label>
        <label class="field">
          <span class="label">Комментарий <span class="opt">(необязательно)</span></span>
          <textarea v-model="createForm.comment" rows="2" placeholder="Багаж, детское кресло, адрес подачи…" />
        </label>
        <div class="total-row">
          <span class="total-cap">Итого</span>
          <span class="total-sum">{{ createTotal }}</span>
        </div>
        <div v-if="createError" class="form-error">{{ createError }}</div>
      </form>

      <template #footer>
        <button type="button" class="btn ghost" @click="closeCreate">Отмена</button>
        <button type="button" class="btn primary" :disabled="creating" @click="submitCreate">
          {{ creating ? 'Создание…' : 'Создать бронь' }}
        </button>
      </template>
    </AppModal>
    </template>

    <!-- Custom requests tab -->
    <template v-else>
      <StateBlock :loading="customLoading" :error="customError" @retry="loadCustom">
        <div class="table">
          <div class="row c-row head-row">
            <span>Клиент</span>
            <span>Маршрут</span>
            <span>Дата</span>
            <span>Пасс.</span>
            <span>Класс</span>
            <span>Статус</span>
            <span></span>
          </div>
          <EmptyState
            v-if="customItems.length === 0"
            icon="drafts"
            title="Заявок пока нет"
            description="Здесь появятся заявки, оставленные клиентами, когда подходящего рейса не нашлось."
          />
          <div v-for="r in customItems" :key="r.id" class="row c-row data-row" @click="openCustom(r)">
            <span class="client">
              <span class="strong block">{{ r.clientName ?? 'Гость' }}</span>
              <span class="sub">{{ r.phone }}</span>
            </span>
            <span class="strong">{{ customRouteLabel(r) }}</span>
            <span class="muted">{{ dateLabel(r.date) }}<template v-if="r.time"> · {{ r.time }}</template></span>
            <span class="strong">{{ r.pax }}</span>
            <span class="muted">
              {{ r.carType ? CAR_TYPE_LABEL[r.carType] : '—' }}<template v-if="r.wholeCabin"> · салон</template>
            </span>
            <span><StatusChip kind="application" :status="r.status" /></span>
            <span class="chevron material-symbols-outlined">chevron_right</span>
          </div>
        </div>

        <!-- Mobile cards -->
        <div class="m-cards">
          <EmptyState
            v-if="customItems.length === 0"
            icon="drafts"
            title="Заявок пока нет"
            description="Здесь появятся заявки, оставленные клиентами, когда подходящего рейса не нашлось."
          />
          <div v-for="r in customItems" :key="r.id" class="m-card" @click="openCustom(r)">
            <div class="m-card-top">
              <div class="m-head-left">
                <div class="m-code">{{ dateLabel(r.date) }}</div>
                <div class="m-title">{{ customRouteLabel(r) }}</div>
              </div>
              <StatusChip kind="application" :status="r.status" />
            </div>
            <div class="m-client">
              <span class="m-name">{{ r.clientName ?? 'Гость' }}</span>
              <span class="m-phone">{{ r.phone }}</span>
            </div>
            <div class="m-meta">
              <div class="m-meta-item">
                <span class="m-cap">Пасс.</span>
                <span class="m-val">{{ r.pax }}</span>
              </div>
              <div class="m-meta-item">
                <span class="m-cap">Класс</span>
                <span class="m-val">{{ r.carType ? CAR_TYPE_LABEL[r.carType] : '—' }}<template v-if="r.wholeCabin"> · салон</template></span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="customItems.length" class="pager">
          <span class="page-info">{{ customPageStart }}–{{ customPageEnd }} из {{ customTotal }}</span>
          <div class="page-buttons">
            <button type="button" :disabled="!customCanPrev" @click="customPrev">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button type="button" :disabled="!customCanNext" @click="customNext">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </StateBlock>
    </template>

    <!-- Custom request detail drawer -->
    <AppDrawer :open="!!customSelected" @close="closeCustom">
      <template v-if="customSelected">
        <div class="drawer-head">
          <div>
            <div class="drawer-code">Заявка клиента</div>
            <div class="drawer-route">{{ customRouteLabel(customSelected) }}</div>
          </div>
          <button class="drawer-close" type="button" @click="closeCustom">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="drawer-body" data-scroll>
          <div class="chip-row">
            <StatusChip kind="application" :status="customSelected.status" />
          </div>

          <div class="grid">
            <div>
              <div class="cap">Дата поездки</div>
              <div class="val">{{ dateLabel(customSelected.date) }}</div>
            </div>
            <div>
              <div class="cap">Желаемое время</div>
              <div class="val">{{ customSelected.time ?? 'Не важно' }}</div>
            </div>
            <div>
              <div class="cap">Пассажиров</div>
              <div class="val">{{ paxLabel(customSelected.pax) }}</div>
            </div>
            <div>
              <div class="cap">Класс авто</div>
              <div class="val">{{ customSelected.carType ? CAR_TYPE_LABEL[customSelected.carType] : 'Не важно' }}</div>
            </div>
            <div>
              <div class="cap">Весь салон</div>
              <div class="val">{{ customSelected.wholeCabin ? 'Да' : 'Нет' }}</div>
            </div>
          </div>

          <div v-if="customSelected.comment" class="comment">
            <div class="cap">Комментарий</div>
            <div class="comment-text">{{ customSelected.comment }}</div>
          </div>

          <div class="divider" />

          <div class="section-title">Контакт</div>
          <div class="client-name">{{ customSelected.clientName ?? 'Гость' }}</div>
          <div class="client-phone">{{ customSelected.phone }}</div>

          <div class="divider" />

          <div class="section-title">Сменить статус</div>
          <div v-if="customStatusError" class="status-error">{{ customStatusError }}</div>
          <div class="status-actions">
            <button
              v-for="st in customNextStatuses[customSelected.status]"
              :key="st"
              type="button"
              class="status-btn"
              :class="{ danger: st === 'REJECTED', accept: st === 'ACCEPTED' }"
              :disabled="customStatusBusy"
              @click="st === 'ACCEPTED' ? openApprove() : changeCustomStatus(st)"
            >
              {{ st === 'ACCEPTED' ? 'Принять — создать рейс' : APPLICATION_STATUS_LABEL[st] }}
            </button>
          </div>
        </div>

        <div class="drawer-footer">
          <a class="wa" :href="customWaLink(customSelected)" target="_blank" rel="noopener">
            <span class="material-symbols-outlined">chat</span>
            WhatsApp
          </a>
        </div>
      </template>
    </AppDrawer>

    <!-- Approve custom request → create flight + booking -->
    <AppModal
      :open="approveOpen"
      title="Принять заявку"
      subtitle="Создаётся новый рейс, клиент бронируется на него"
      @close="closeApprove"
    >
      <form class="form" @submit.prevent="submitApprove">
        <label class="field">
          <span class="label">Маршрут <span class="opt">(в нём задана цена)</span></span>
          <select v-model="approveForm.routeId">
            <option v-if="approveRoutes.length === 0" value="">Нет маршрутов</option>
            <option v-for="r in approveRoutes" :key="r.id" :value="r.id">{{ flightRouteOptionLabel(r) }}</option>
          </select>
        </label>
        <div class="two">
          <label class="field">
            <span class="label">Дата рейса</span>
            <input v-model="approveForm.date" type="date" />
          </label>
          <label class="field">
            <span class="label">Время</span>
            <input v-model="approveForm.time" type="time" />
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Машина <span class="opt">(необязательно)</span></span>
            <select v-model="approveForm.carId">
              <option value="">Назначить позже</option>
              <option v-for="c in approveCars" :key="c.id" :value="c.id">{{ c.model }} · {{ c.plate }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Мест в рейсе</span>
            <input v-model.number="approveForm.seatsTotal" type="number" min="1" inputmode="numeric" />
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Имя клиента</span>
            <input v-model="approveForm.name" placeholder="Айгуль Сапарова" />
          </label>
          <label class="field">
            <span class="label">Телефон</span>
            <input v-model="approveForm.phone" placeholder="+996 700 000 000" />
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Пассажиров</span>
            <div class="stepper">
              <button type="button" @click="approveForm.pax = Math.max(1, approveForm.pax - 1)">−</button>
              <span class="stepper-val">{{ approveForm.pax }}</span>
              <button type="button" @click="approveForm.pax = approveForm.pax + 1">+</button>
            </div>
          </label>
          <label class="check whatsapp-check">
            <input v-model="approveForm.whatsapp" type="checkbox" />
            <span>Номер в WhatsApp</span>
          </label>
        </div>
        <div class="two">
          <label class="field">
            <span class="label">Скидка <span class="opt">(необязательно)</span></span>
            <input v-model.number="approveForm.discount" type="number" min="0" inputmode="numeric" placeholder="0" />
          </label>
          <label class="field">
            <span class="label">Предоплата <span class="opt">(необязательно)</span></span>
            <input v-model.number="approveForm.prepaid" type="number" min="0" inputmode="numeric" placeholder="0" />
          </label>
        </div>
        <label class="field">
          <span class="label">Комментарий <span class="opt">(необязательно)</span></span>
          <textarea v-model="approveForm.comment" rows="2" placeholder="Особые пожелания…" />
        </label>
        <div class="total-row">
          <span class="total-cap">Итого</span>
          <span class="total-sum">{{ approveTotal }}</span>
        </div>
        <div v-if="approveError" class="form-error">{{ approveError }}</div>
      </form>

      <template #footer>
        <button type="button" class="btn ghost" @click="closeApprove">Отмена</button>
        <button type="button" class="btn primary" :disabled="approving" @click="submitApprove">
          {{ approving ? 'Создание…' : 'Создать рейс и бронь' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--eg-line);
}
.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 4px 12px;
  margin-right: 18px;
  border: none;
  background: transparent;
  color: var(--eg-muted);
  font: 700 14px var(--eg-font);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab.active {
  color: var(--eg-ink);
  border-bottom-color: var(--eg-brand);
}
.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: var(--eg-brand-light);
  color: var(--eg-brand-dark);
  font: 800 11px var(--eg-font);
}
.c-row {
  grid-template-columns: minmax(180px, 1.6fr) 1.4fr 90px 70px 1.1fr 130px 40px;
  column-gap: 16px;
}
.whatsapp-check {
  align-self: end;
  height: 46px;
}
.status-btn.accept {
  font-weight: 800;
}
.c-row > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.date-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.date-bar-label {
  font: 800 13px var(--eg-font);
  color: var(--eg-muted);
  margin-right: 2px;
}
.date-bar-dash {
  color: var(--eg-hint);
  font-weight: 700;
}
.date-reset {
  height: 38px;
  padding: 0 14px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  background: #fff;
  color: var(--eg-ink);
  font: 700 13px var(--eg-font);
  cursor: pointer;
}
.date-reset:hover {
  border-color: var(--eg-brand);
  color: var(--eg-brand-dark);
}
.chips {
  display: flex;
  gap: 8px;
}
.search {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 38px;
  min-width: 280px;
  margin-left: auto;
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
  grid-template-columns: 80px 1.5fr 1.5fr 1.2fr 70px 120px 130px 40px;
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
.data-row {
  cursor: pointer;
}
.data-row:hover {
  background: #fafbf9;
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
.client .block {
  display: block;
}
.client .sub {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
}
.chevron {
  text-align: right;
  color: #c4c8c0;
  font-size: 20px;
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

/* Drawer */
.drawer-head {
  padding: 22px 24px;
  border-bottom: 1px solid #eef0ec;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.drawer-code {
  font: 700 12px var(--eg-font);
  color: var(--eg-hint);
}
.drawer-route {
  font: 800 20px var(--eg-font);
  margin-top: 2px;
}
.drawer-close {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid var(--eg-border);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 22px 24px;
}
.grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.cap {
  font: 600 11px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
}
.val {
  font: 700 15px var(--eg-font);
  margin-top: 3px;
}
.val.accent {
  color: var(--eg-brand);
  font-weight: 800;
}
.comment {
  margin-top: 16px;
}
.comment-text {
  font: 500 13px var(--eg-font);
  color: var(--eg-ink-soft);
  margin-top: 4px;
}
.divider {
  height: 1px;
  background: #eef0ec;
  margin: 20px 0;
}
.section-title {
  font: 800 14px var(--eg-font);
  margin-bottom: 12px;
}
.client-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--eg-brand-light);
  color: var(--eg-brand-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 800 16px var(--eg-font);
}
.client-name {
  font: 800 15px var(--eg-font);
}
.client-phone {
  font: 600 13px var(--eg-font);
  color: var(--eg-hint);
}
.client-stats {
  display: flex;
  gap: 18px;
  margin-top: 16px;
  padding: 14px 16px;
  background: var(--eg-surface-alt);
  border-radius: 13px;
}
.stat {
  font: 800 18px var(--eg-font);
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.status-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.m-chips {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.pay-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.pay-grid input {
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  font: 600 14px var(--eg-font);
  outline: none;
  background: #fff;
}
.pay-grid input:focus {
  border-color: var(--eg-brand);
}
.pay-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  padding: 12px 14px;
  background: var(--eg-surface-alt);
  border-radius: 12px;
}
.pay-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.pay-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}
.status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.status-btn {
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 11px;
  background: var(--eg-brand);
  color: #fff;
  font: 700 13px var(--eg-font);
  cursor: pointer;
}
.status-btn.danger {
  background: #fff;
  border: 1px solid var(--eg-border);
  color: #c0492e;
}
.status-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.status-final {
  font: 600 13px var(--eg-font);
  color: var(--eg-hint);
}
.status-error {
  background: #fbedea;
  color: #c0492e;
  font: 600 13px var(--eg-font);
  padding: 8px 12px;
  border-radius: 10px;
  margin-bottom: 12px;
}
.drawer-footer {
  padding: 18px 24px;
  border-top: 1px solid #eef0ec;
  display: flex;
  gap: 10px;
}
.wa {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  background: var(--eg-whatsapp);
  color: #fff;
  font: 700 14px var(--eg-font);
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.wa--disabled {
  background: var(--eg-surface-alt, #f6f7f5);
  color: var(--eg-muted, #6e747c);
}

/* Create-booking form */
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
.form select,
.form textarea {
  padding: 12px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  font: 600 14px var(--eg-font);
  outline: none;
  background: #fff;
  resize: none;
}
.form input,
.form select {
  height: 46px;
  padding: 0 12px;
}
.form input:focus,
.form select:focus,
.form textarea:focus {
  border-color: var(--eg-brand);
}
.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 46px;
}
.stepper button {
  width: 40px;
  height: 40px;
  border: 1px solid var(--eg-border);
  background: #fff;
  border-radius: 11px;
  font: 800 18px var(--eg-font);
  cursor: pointer;
}
.stepper-val {
  font: 800 18px var(--eg-font);
  min-width: 28px;
  text-align: center;
}
.check {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 600 13px var(--eg-font);
  color: var(--eg-muted);
  cursor: pointer;
}
.check input {
  width: 18px;
  height: 18px;
  accent-color: var(--eg-brand);
}
@keyframes spin { to { transform: rotate(360deg); } }
/* ── Client search ── */
.client-search-field {
  position: relative;
}
.client-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.cs-icon {
  position: absolute;
  left: 12px;
  font-size: 18px;
  color: #a7aca2;
  pointer-events: none;
  animation: none;
}
.cs-icon.spinning {
  animation: spin 0.9s linear infinite;
}
.cs-input {
  height: 46px !important;
  padding: 0 12px 0 38px !important;
  width: 100%;
}
.suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.13);
  z-index: 20;
  overflow: hidden;
}
.suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  gap: 10px;
}
.suggestion:not(:last-child) {
  border-bottom: 1px solid #f4f5f2;
}
.suggestion:hover {
  background: #f8faf6;
}
.sug-name {
  font: 700 13px var(--eg-font);
}
.sug-phone {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
}
.client-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--eg-brand);
  border-radius: 11px;
  background: var(--eg-brand-light);
}
.chip-icon {
  font-size: 18px;
  color: var(--eg-brand-dark);
}
.chip-name {
  font: 700 14px var(--eg-font);
  color: var(--eg-ink);
  flex: 1;
}
.chip-phone {
  font: 500 13px var(--eg-font);
  color: var(--eg-hint);
}
.chip-clear {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--eg-muted);
  padding: 0;
}
.chip-clear:hover {
  background: rgba(0,0,0,0.06);
}
.chip-clear .material-symbols-outlined {
  font-size: 16px;
}
.form input:disabled {
  background: #f4f5f2;
  color: var(--eg-muted);
  cursor: default;
}
.total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--eg-surface-alt);
  border-radius: 12px;
}
.total-cap {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
}
.total-sum {
  font: 800 20px var(--eg-font);
  color: var(--eg-brand);
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
  cursor: pointer;
}
.m-card:active {
  background: #fafbf9;
}
.m-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.m-head-left {
  min-width: 0;
}
.m-code {
  font: 700 11px var(--eg-font);
  color: var(--eg-hint);
}
.m-title {
  font: 800 16px var(--eg-font);
  margin-top: 2px;
}
.m-client {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 8px;
}
.m-name {
  font: 700 14px var(--eg-font);
}
.m-phone {
  font: 500 13px var(--eg-font);
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
.m-val.accent {
  color: var(--eg-brand);
  font-weight: 800;
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
  .two {
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
