<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CarType, CarFeature, StopKind, Route } from '@easygo/shared';
import { paxLabel, carTypeSeats, formatMoney, CAR_TYPE_LABEL, CAR_TYPE_SEAT_OPTIONS, CarFeature as CarFeatureEnum, CAR_FEATURE_LABEL } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';

/** Always-visible "leave an individual request" CTA + modal form. Used on the
 *  results and booking screens so a customer can ask an operator to arrange a
 *  different car / time / seat count when no listed flight fits. Reads the
 *  search context (route, date, pax) straight from the booking store. */
const props = withDefaults(
  defineProps<{
    label?: string;
    hint?: string;
  }>(),
  {
    label: 'Нет подходящего рейса?',
    hint: 'Оставьте заявку — оператор свяжется с вам по WhatsApp',
  },
);

const router = useRouter();
const route = useRoute();
const store = useBookingStore();
const authStore = useAuthStore();

// Editable passenger count. Seeded from the search context but the customer can
// adjust it here (like the booking form) — kept local so it doesn't mutate the
// global search state.
const pax = ref(store.pax);
// The passenger count can't exceed the selected vehicle's capacity (sedan 4,
// minivan 5/6/7, bus 20). `seats` holds the chosen car's seat count.
const maxPax = computed(() => seats.value);
function decPax() {
  if (pax.value > 1) pax.value -= 1;
}
function incPax() {
  if (pax.value < maxPax.value) pax.value += 1;
}
const paxLabelVal = computed(() => paxLabel(pax.value));

const carTypes: CarType[] = ['SEDAN', 'MINIVAN', 'BUS'];
const featureOptions = CarFeatureEnum.options.map((value) => ({ value, label: CAR_FEATURE_LABEL[value] }));
const open = ref(false);
const phone = ref(authStore.client?.phone ?? '');
const comment = ref('');
const time = ref(''); // "HH:MM" desired departure time (empty = no preference)
const carType = ref<CarType>('MINIVAN');
const seats = ref<number>(CAR_TYPE_SEAT_OPTIONS.MINIVAN[0]);
const wholeCabin = ref(false);
const features = ref<CarFeature[]>([]);

// Pricing is only shown when the requested direction already exists as an active
// route. Otherwise the price is negotiated by an operator (see hasPricing below).
const publicRoutes = ref<Route[]>([]);
const matchedRoute = computed<Route | null>(
  () =>
    publicRoutes.value.find(
      (r) => r.fromCity === store.fromCity && r.toCity === store.toCity,
    ) ?? null,
);
const hasPricing = computed(() => matchedRoute.value !== null);
// Per-seat price for this direction — shown only when it exists as a route.
const unitPriceLabel = computed(() => (matchedRoute.value ? money(matchedRoute.value.price) : ''));

// Whole-cabin price for the currently selected car class (may be unset → null).
const cabinPriceForType = computed<number | null>(() => {
  const r = matchedRoute.value;
  if (!r) return null;
  if (carType.value === 'SEDAN') return r.cabinPriceSedan;
  if (carType.value === 'BUS') return r.cabinPriceBus;
  return r.cabinPriceMinivan;
});
// Estimated total: flat cabin price when buying the whole car, else per-seat × pax.
const estimatedTotal = computed<number | null>(() => {
  const r = matchedRoute.value;
  if (!r) return null;
  if (wholeCabin.value) return cabinPriceForType.value;
  return r.price * pax.value;
});
// How much the flat cabin price saves vs. paying per seat for a full car — the
// basis for the "Выгоднее" badge. Only meaningful when this direction is priced.
const cabinSavings = computed<number>(() => {
  const r = matchedRoute.value;
  const cabin = cabinPriceForType.value;
  if (!r || cabin == null) return 0;
  return Math.max(0, r.price * seats.value - cabin);
});
const currency = computed(() => configStore.config?.currency ?? 'KGS');
function money(minor: number): string {
  return formatMoney(minor, currency.value);
}

function toggleFeature(value: CarFeature) {
  features.value = features.value.includes(value)
    ? features.value.filter((f) => f !== value)
    : [...features.value, value];
}

// ── Pickup/dropoff points: paid per point, price confirmed by the operator.
// At most one point of each type (pickup / dropoff) per passenger. ──
const configStore = useConfigStore();
const stops = ref<Array<{ kind: StopKind; address: string }>>([]);
const stopsError = ref('');

// "Салон" books the whole car, so its capacity is the passenger count.
const effectivePax = computed(() => (wholeCabin.value ? seats.value : pax.value));
const pickupCount = computed(() => stops.value.filter((s) => s.kind === 'PICKUP').length);
const dropoffCount = computed(() => stops.value.filter((s) => s.kind === 'DROPOFF').length);
const canAddStop = computed(
  () => pickupCount.value < effectivePax.value || dropoffCount.value < effectivePax.value,
);

function addStop() {
  if (!canAddStop.value) return;
  // Default the new row to whichever type still has room.
  const kind: StopKind = pickupCount.value < effectivePax.value ? 'PICKUP' : 'DROPOFF';
  stops.value.push({ kind, address: '' });
}
function removeStop(index: number) {
  stops.value.splice(index, 1);
  stopsError.value = '';
}

const stopPriceHint = computed(() => {
  const c = configStore.config;
  if (!c || (!c.stopPriceCity && !c.stopPriceOutside)) return '';
  const parts: string[] = [];
  if (c.stopPriceCity) parts.push(`по городу — от ${formatMoney(c.stopPriceCity, c.currency)}`);
  if (c.stopPriceOutside) parts.push(`за городом — от ${formatMoney(c.stopPriceOutside, c.currency)}`);
  return `Ориентировочно ${parts.join(', ')}.`;
});
const submitting = ref(false);
const success = ref(false);
const error = ref<string | null>(null);

// Seat options for the chosen class (sedan/bus have one, minivan 5/6/7).
const carSeatOptions = computed(() => CAR_TYPE_SEAT_OPTIONS[carType.value]);

/** Snap the seat count into the selected type's allowed range. */
function selectCarType(type: CarType) {
  carType.value = type;
  const opts: readonly number[] = CAR_TYPE_SEAT_OPTIONS[type];
  if (!opts.includes(seats.value)) seats.value = carTypeSeats(type);
}

// Never let the requested passenger count exceed the chosen vehicle's capacity
// (e.g. switching to a sedan, or picking a 5-seat minivan while 7 are set).
watch(maxPax, (max) => {
  if (pax.value > max) pax.value = max;
});

function openForm() {
  // Leaving a request is a customer action — guests log in first, then return
  // here to submit it.
  if (!authStore.isAuthenticated) {
    void router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  phone.value = authStore.client?.phone ?? '';
  carType.value = 'MINIVAN';
  seats.value = CAR_TYPE_SEAT_OPTIONS.MINIVAN[0];
  // Seed from search context, but never above the default vehicle's capacity.
  pax.value = Math.min(store.pax, seats.value);
  comment.value = '';
  time.value = '';
  wholeCabin.value = false;
  features.value = [];
  stops.value = [];
  stopsError.value = '';
  error.value = null;
  success.value = false;
  open.value = true;
  void configStore.load();
  // Load active routes so we can quote the request if this direction exists.
  api.routes
    .public()
    .then((rs) => {
      publicRoutes.value = rs;
    })
    .catch(() => {
      publicRoutes.value = [];
    });
}

async function submit() {
  error.value = null;
  stopsError.value = '';
  const p = phone.value.trim();
  if (!p) {
    error.value = 'Укажите номер телефона';
    return;
  }
  // Every added point needs an address; empty rows are rejected, not dropped.
  if (stops.value.some((s) => !s.address.trim())) {
    stopsError.value = 'Укажите адрес для каждой точки или удалите пустую';
    return;
  }
  if (pickupCount.value > effectivePax.value || dropoffCount.value > effectivePax.value) {
    stopsError.value = `Точек каждого типа не может быть больше, чем пассажиров (${effectivePax.value})`;
    return;
  }
  submitting.value = true;
  try {
    // "Салон" books the whole car → pax is the chosen vehicle's capacity.
    const paxValue = wholeCabin.value ? seats.value : pax.value;
    await api.customRequests.create({
      fromCity: store.fromCity,
      toCity: store.toCity,
      date: store.date,
      time: time.value || undefined,
      pax: paxValue,
      carType: carType.value,
      features: features.value,
      wholeCabin: wholeCabin.value,
      stops: stops.value
        .filter((s) => s.address.trim())
        .map((s) => ({ kind: s.kind, address: s.address.trim() })),
      phone: p,
      comment: comment.value.trim() || undefined,
    });
    success.value = true;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Не удалось отправить заявку';
  } finally {
    submitting.value = false;
  }
}

function closeForm() {
  open.value = false;
  success.value = false;
}
</script>

<template>
  <button class="custom-cta custom-cta--inline" @click="openForm">
    <span class="ms custom-cta__icon">support_agent</span>
    <div class="custom-cta__body">
      <span class="custom-cta__label">{{ props.label }}</span>
      <span class="custom-cta__hint">{{ props.hint }}</span>
    </div>
    <span class="ms custom-cta__arrow">chevron_right</span>
  </button>

  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-overlay" @click.self="closeForm">
        <div class="modal-sheet">
          <!-- Success state -->
          <div v-if="success" class="modal-success">
            <span class="ms modal-success__icon">check_circle</span>
            <div class="modal-success__title">Заявка отправлена!</div>
            <div class="modal-success__text">Оператор свяжется с вами в WhatsApp в ближайшее время.</div>
            <button class="btn-primary" @click="closeForm">Закрыть</button>
          </div>

          <!-- Form state -->
          <template v-else>
            <div class="modal-header">
              <div class="modal-title">Индивидуальная заявка</div>
              <button class="modal-close" @click="closeForm">
                <span class="ms">close</span>
              </button>
            </div>

            <div class="modal-body">
            <!-- Pre-filled route summary -->
            <div class="modal-route">
              <div class="modal-route__row">
                <span class="ms modal-route__icon">location_on</span>
                <span>{{ store.fromCity }} → {{ store.toCity }}</span>
              </div>
              <div class="modal-route__row">
                <span class="ms modal-route__icon">calendar_today</span>
                <span>{{ store.date }}</span>
              </div>
            </div>

            <div class="modal-fields">
              <!-- Passenger count stepper (mirrors the booking form) -->
              <div class="field" v-if="!wholeCabin">
                <span class="field__label">Количество пассажиров</span>
                <div class="pax-row">
                  <button
                    type="button"
                    class="pax-btn"
                    :disabled="pax <= 1"
                    @click="decPax"
                  >
                    <span class="ms">remove</span>
                  </button>
                  <div class="pax-num">{{ pax }}</div>
                  <button
                    type="button"
                    class="pax-btn"
                    :disabled="pax >= maxPax"
                    @click="incPax"
                  >
                    <span class="ms">add</span>
                  </button>
                </div>
                <div v-if="hasPricing" class="pax-price-hint">
                  Цена за место · {{ unitPriceLabel }}
                </div>
              </div>

              <!-- Car type selection -->
              <div class="field">
                <span class="field__label">Тип машины</span>
                <div class="type-chips">
                  <button
                    v-for="t in carTypes"
                    :key="t"
                    type="button"
                    :class="['type-chip', carType === t && 'type-chip--active']"
                    @click="selectCarType(t)"
                  >
                    {{ CAR_TYPE_LABEL[t] }}
                  </button>
                </div>
              </div>

              <!-- Minivan seat sub-selection (5/6/7) -->
              <div v-if="carSeatOptions.length > 1" class="field">
                <span class="field__label">Количество мест в машине</span>
                <div class="type-chips">
                  <button
                    v-for="n in carSeatOptions"
                    :key="n"
                    type="button"
                    :class="['type-chip', seats === n && 'type-chip--active']"
                    @click="seats = n"
                  >
                    {{ n }}
                  </button>
                </div>
              </div>

              <!-- "Салон" — book the entire car -->
              <button
                type="button"
                :class="['cabin-toggle', wholeCabin && 'cabin-toggle--active']"
                @click="wholeCabin = !wholeCabin"
              >
                <span class="ms cabin-toggle__check">
                  {{ wholeCabin ? 'check_box' : 'check_box_outline_blank' }}
                </span>
                <span class="cabin-toggle__body">
                  <span class="cabin-toggle__head">
                    <span class="cabin-toggle__label">Выкупить весь салон</span>
                    <span v-if="cabinSavings > 0" class="cabin-toggle__badge">Выгоднее</span>
                  </span>
                  <span class="cabin-toggle__hint">
                    <template v-if="cabinSavings > 0">
                      Вся машина за {{ money(cabinPriceForType!) }} — экономия {{ money(cabinSavings) }}
                    </template>
                    <template v-else-if="cabinPriceForType != null">
                      Вся машина за {{ money(cabinPriceForType) }}
                    </template>
                    <template v-else>Бронируются все {{ seats }} мест в машине</template>
                  </span>
                </span>
              </button>

              <!-- Desired car features -->
              <div class="field">
                <span class="field__label">Доп. оснащение (необязательно)</span>
                <div class="type-chips">
                  <button
                    v-for="f in featureOptions"
                    :key="f.value"
                    type="button"
                    :class="['feature-chip', features.includes(f.value) && 'feature-chip--active']"
                    @click="toggleFeature(f.value)"
                  >
                    {{ f.label }}
                  </button>
                </div>
              </div>

              <!-- Pickup / dropoff points -->
              <div class="field">
                <span class="field__label">Точки сбора и развоза (необязательно)</span>
                <div class="stops">
                  <div
                    v-for="(s, i) in stops"
                    :key="i"
                    class="stop-row"
                    :class="{ 'stop-row--error': stopsError && !s.address.trim() }"
                  >
                    <div class="stop-kind">
                      <button
                        type="button"
                        :class="['stop-kind-btn', s.kind === 'PICKUP' && 'stop-kind-btn--on']"
                        @click="s.kind = 'PICKUP'"
                      >Сбор</button>
                      <button
                        type="button"
                        :class="['stop-kind-btn', s.kind === 'DROPOFF' && 'stop-kind-btn--on']"
                        @click="s.kind = 'DROPOFF'"
                      >Развоз</button>
                    </div>
                    <input
                      v-model="s.address"
                      class="field__input stop-address"
                      type="text"
                      :placeholder="s.kind === 'PICKUP' ? 'Адрес, откуда забрать' : 'Адрес, куда отвезти'"
                    />
                    <button type="button" class="stop-remove" @click="removeStop(i)">
                      <span class="ms">delete</span>
                    </button>
                  </div>
                  <button v-if="canAddStop" type="button" class="stop-add" @click="addStop">
                    <span class="ms">add_location_alt</span>
                    Добавить точку
                  </button>
                  <div v-else-if="stops.length" class="stop-limit">
                    Максимум {{ effectivePax }} сбора и {{ effectivePax }} развоза — по одной каждого типа на пассажира.
                  </div>
                  <div v-if="stopsError" class="stop-err">{{ stopsError }}</div>
                  <div v-if="stops.length" class="stop-note">
                    За каждую точку взимается доплата — цену подтвердит оператор.
                    <template v-if="stopPriceHint"> {{ stopPriceHint }}</template>
                  </div>
                </div>
              </div>

              <label class="field">
                <span class="field__label">Желаемое время (необязательно)</span>
                <input
                  v-model="time"
                  class="field__input"
                  type="time"
                  placeholder="ЧЧ:ММ"
                />
              </label>

              <label class="field">
                <span class="field__label">Номер телефона (WhatsApp)</span>
                <input
                  v-model="phone"
                  class="field__input"
                  type="tel"
                  placeholder="+996 700 000 000"
                  inputmode="tel"
                />
              </label>

              <label class="field">
                <span class="field__label">Комментарий (необязательно)</span>
                <textarea
                  v-model="comment"
                  class="field__input field__textarea"
                  placeholder="Особые пожелания..."
                  rows="3"
                ></textarea>
              </label>

              <!-- Pricing: shown only when this direction is an existing route;
                   otherwise the price is negotiated by an operator. -->
              <div v-if="hasPricing" class="price-box">
                <!-- Per-seat price is already shown next to the stepper above;
                     only repeat it here when the stepper itself is hidden
                     (whole-cabin mode). -->
                <div v-if="wholeCabin" class="price-box__row price-box__row--sub">
                  <span class="price-box__sub-label">Цена за место</span>
                  <span class="price-box__sub-value">{{ unitPriceLabel }}</span>
                </div>
                <div class="price-box__row">
                  <span class="price-box__label">
                    {{ wholeCabin ? 'Весь салон' : `Стоимость · ${paxLabelVal}` }}
                  </span>
                  <span class="price-box__value">
                    {{ estimatedTotal != null ? money(estimatedTotal) : 'по запросу' }}
                  </span>
                </div>
                <div class="price-box__note">
                  Оператор подтвердит финальную стоимость с учётом точек и пожеланий.
                </div>
              </div>
              <div v-else class="price-note">
                <span class="ms price-note__icon">info</span>
                <span>Стоимость по этому направлению обговаривается индивидуально — оператор свяжется с вами и назовёт цену.</span>
              </div>

              <div v-if="error" class="modal-error">{{ error }}</div>

              <button
                class="btn-primary"
                :disabled="submitting"
                @click="submit"
              >
                {{ submitting ? 'Отправка...' : 'Отправить заявку' }}
              </button>
            </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Custom request CTA ── */
.custom-cta {
  display: flex;
  align-items: center;
  gap: 12px;
  border: none;
  cursor: pointer;
  text-align: left;
  width: auto;
}

.custom-cta--inline {
  /* Buttons shrink-to-fit their content, so stretch to fill the column
     (full width minus the 16px side margins) instead of hugging the text. */
  box-sizing: border-box;
  width: calc(100% - 32px);
  margin: 16px 16px 0;
  padding: 16px;
  background: var(--eg-green);
  border-radius: 16px;
  color: #fff;
}

.custom-cta--inline .custom-cta__icon {
  font-size: 26px;
  color: #fff;
  flex-shrink: 0;
}

.custom-cta--inline .custom-cta__label {
  font: 700 14px 'Manrope', sans-serif;
  color: #fff;
}

.custom-cta--inline .custom-cta__hint {
  font: 500 12px 'Manrope', sans-serif;
  color: rgba(255,255,255,0.8);
  margin-top: 2px;
}

.custom-cta--inline .custom-cta__arrow {
  font-size: 22px;
  color: rgba(255,255,255,0.7);
  margin-left: auto;
  flex-shrink: 0;
}

.custom-cta__body {
  display: flex;
  flex-direction: column;
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(22, 24, 28, 0.55);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* The backdrop must not pan/scroll the page behind it — without this the
     whole overlay can be dragged in any direction on touch (mobile). */
  touch-action: none;
  overscroll-behavior: contain;
}

.modal-sheet {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  max-height: 92dvh;
  overflow-y: auto;
  /* Allow only vertical scrolling inside the sheet; block horizontal drag and
     scroll-chaining to the page underneath. */
  touch-action: pan-y;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* Pinned to the top of the sheet so the close button stays reachable while
     the body scrolls. */
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  padding: 16px 20px;
  border-bottom: 1px solid #EFF0ED;
  border-radius: 24px 24px 0 0;
}

.modal-body {
  padding: 16px 20px 40px;
}

.modal-title {
  font: 800 18px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.modal-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: #F2F3F0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--eg-muted);
}

.modal-route {
  background: #F5F6F3;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.modal-route__row {
  display: flex;
  align-items: center;
  gap: 8px;
  font: 600 13px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.modal-route__icon {
  font-size: 18px;
  color: var(--eg-green);
}

.modal-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.field__input {
  border: 1.5px solid #E7E9E5;
  border-radius: 12px;
  padding: 12px 14px;
  font: 500 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
  background: #fff;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.field__input:focus {
  border-color: var(--eg-green);
}

/* iOS Safari renders type="time"/"date" as native controls with an intrinsic
   width that ignores width:100% and overflows the sheet. Strip the native
   appearance so they obey the same box model as the text fields. */
.field__input[type='time'],
.field__input[type='date'] {
  -webkit-appearance: none;
  appearance: none;
  min-width: 0;
  /* An empty native value has no line box, so appearance:none collapses the
     height. Pin it to match the padding-based height of the text fields. */
  min-height: 46px;
}

.field__input[type='time']::-webkit-date-and-time-value {
  text-align: left;
  margin: 0;
}

.field__textarea {
  resize: vertical;
  min-height: 80px;
}

/* ── Passenger stepper ── */
.pax-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pax-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 1.5px solid #E7E9E5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--eg-green);
  transition: border-color 0.15s, background 0.15s;
}

.pax-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pax-num {
  font: 800 18px 'Manrope', sans-serif;
  min-width: 28px;
  text-align: center;
  color: var(--eg-ink);
}

.pax-price-hint {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted);
}

/* ── Car type / seat chips ── */
.type-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-chip {
  flex: 1;
  min-width: 64px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1.5px solid #E7E9E5;
  background: #fff;
  cursor: pointer;
  font: 700 13px 'Manrope', sans-serif;
  color: var(--eg-muted);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.type-chip--active {
  border-color: var(--eg-green);
  background: #EEF6E6;
  color: var(--eg-green);
}

/* ── Feature chips (multi-select, wrap by content) ── */
.feature-chip {
  padding: 9px 13px;
  border-radius: 12px;
  border: 1.5px solid #E7E9E5;
  background: #fff;
  cursor: pointer;
  font: 700 13px 'Manrope', sans-serif;
  color: var(--eg-muted);
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.feature-chip--active {
  border-color: var(--eg-green);
  background: #EEF6E6;
  color: var(--eg-green);
}

/* ── "Салон" toggle ── */
.cabin-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1.5px solid #E7E9E5;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.cabin-toggle--active {
  border-color: var(--eg-green);
  background: #EEF6E6;
}

.cabin-toggle__check {
  font-size: 24px;
  color: var(--eg-green);
  flex-shrink: 0;
}

.cabin-toggle__body {
  display: flex;
  flex-direction: column;
}

.cabin-toggle__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cabin-toggle__label {
  font: 700 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.cabin-toggle__badge {
  font: 700 10px 'Manrope', sans-serif;
  color: var(--eg-green);
  background: #DDF0CB;
  border-radius: 6px;
  padding: 2px 6px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.cabin-toggle__hint {
  font: 500 12px 'Manrope', sans-serif;
  color: var(--eg-muted);
  margin-top: 2px;
}

/* ── Pickup/dropoff points ── */
.stops {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stop-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stop-kind {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.stop-kind-btn {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1.5px solid #E7E9E5;
  background: #fff;
  cursor: pointer;
  font: 700 11px 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.stop-kind-btn--on {
  border-color: var(--eg-green);
  background: #EEF6E6;
  color: var(--eg-green);
}

.stop-address {
  flex: 1;
  min-width: 0;
}

.stop-row--error .stop-address {
  border-color: #E05252;
}

.stop-limit {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted);
  text-align: center;
  padding: 2px 0;
}

.stop-err {
  font: 600 12px 'Manrope', sans-serif;
  color: #E05252;
}

.stop-remove {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid #E7E9E5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  color: #C0492E;
  flex-shrink: 0;
}

.stop-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  border: 1.5px dashed #C9D6BC;
  border-radius: 12px;
  background: #F7FAF3;
  color: var(--eg-green);
  font: 700 13px 'Manrope', sans-serif;
  cursor: pointer;
}

.stop-add .ms {
  font-size: 19px;
}

.stop-note {
  font: 500 12px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
  background: #F5F6F3;
  border-radius: 10px;
  padding: 9px 12px;
}

.modal-error {
  font: 500 13px 'Manrope', sans-serif;
  color: #E05252;
  padding: 10px 14px;
  background: #FFF0F0;
  border-radius: 10px;
}

/* ── Pricing summary (existing route) ── */
.price-box {
  background: #EEF6E6;
  border: 1.5px solid #D3E8C0;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.price-box__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.price-box__row--sub {
  padding-bottom: 6px;
  border-bottom: 1px solid #D3E8C0;
}

.price-box__sub-label {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.price-box__sub-value {
  font: 700 13px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.price-box__label {
  font: 700 13px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.price-box__value {
  font: 800 18px 'Manrope', sans-serif;
  color: var(--eg-green);
}

.price-box__note {
  font: 500 12px/1.4 'Manrope', sans-serif;
  color: var(--eg-muted);
}

/* ── Price note (unknown route) ── */
.price-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #F5F6F3;
  border-radius: 12px;
  padding: 12px 14px;
  font: 500 13px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.price-note__icon {
  font-size: 20px;
  color: var(--eg-green);
  flex-shrink: 0;
}

.btn-primary {
  width: 100%;
  padding: 15px;
  background: var(--eg-green);
  color: #fff;
  border: none;
  border-radius: 14px;
  font: 700 15px 'Manrope', sans-serif;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Success */
.modal-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 32px 24px;
  text-align: center;
}

.modal-success__icon {
  font-size: 56px;
  color: var(--eg-green);
}

.modal-success__title {
  font: 800 20px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.modal-success__text {
  font: 500 14px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
  max-width: 280px;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-active .modal-sheet,
.modal-leave-active .modal-sheet {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-sheet,
.modal-leave-to .modal-sheet {
  transform: translateY(100%);
}
</style>
