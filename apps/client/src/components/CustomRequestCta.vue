<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CarType } from '@easygo/shared';
import { paxLabel, carTypeSeats, CAR_TYPE_LABEL, CAR_TYPE_SEAT_OPTIONS } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';

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
    hint: 'Оставьте заявку — оператор перезвонит в WhatsApp',
  },
);

const router = useRouter();
const route = useRoute();
const store = useBookingStore();
const authStore = useAuthStore();

const paxLabelVal = computed(() => paxLabel(store.pax));

const carTypes: CarType[] = ['SEDAN', 'MINIVAN', 'BUS'];
const open = ref(false);
const phone = ref(authStore.client?.phone ?? '');
const comment = ref('');
const time = ref(''); // "HH:MM" desired departure time (empty = no preference)
const carType = ref<CarType>('MINIVAN');
const seats = ref<number>(CAR_TYPE_SEAT_OPTIONS.MINIVAN[0]);
const wholeCabin = ref(false);
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

function openForm() {
  // Leaving a request is a customer action — guests log in first, then return
  // here to submit it.
  if (!authStore.isAuthenticated) {
    void router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  phone.value = authStore.client?.phone ?? '';
  comment.value = '';
  time.value = '';
  carType.value = 'MINIVAN';
  seats.value = CAR_TYPE_SEAT_OPTIONS.MINIVAN[0];
  wholeCabin.value = false;
  error.value = null;
  success.value = false;
  open.value = true;
}

async function submit() {
  error.value = null;
  const p = phone.value.trim();
  if (!p) {
    error.value = 'Укажите номер телефона';
    return;
  }
  submitting.value = true;
  try {
    // "Салон" books the whole car → pax is the chosen vehicle's capacity.
    const pax = wholeCabin.value ? seats.value : store.pax;
    await api.customRequests.create({
      fromCity: store.fromCity,
      toCity: store.toCity,
      date: store.date,
      time: time.value || undefined,
      pax,
      carType: carType.value,
      wholeCabin: wholeCabin.value,
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
              <div class="modal-route__row">
                <span class="ms modal-route__icon">group</span>
                <span>{{ paxLabelVal }}</span>
              </div>
            </div>

            <div class="modal-fields">
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
                <span class="field__label">Количество мест</span>
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
                  <span class="cabin-toggle__label">Выкупить весь салон</span>
                  <span class="cabin-toggle__hint">Бронируются все {{ seats }} мест в машине</span>
                </span>
              </button>

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

              <div v-if="error" class="modal-error">{{ error }}</div>

              <button
                class="btn-primary"
                :disabled="submitting"
                @click="submit"
              >
                {{ submitting ? 'Отправка...' : 'Отправить заявку' }}
              </button>
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
}

.modal-sheet {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 20px 20px 40px;
  max-height: 92dvh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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

.field__textarea {
  resize: vertical;
  min-height: 80px;
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

.cabin-toggle__label {
  font: 700 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.cabin-toggle__hint {
  font: 500 12px 'Manrope', sans-serif;
  color: var(--eg-muted);
  margin-top: 2px;
}

.modal-error {
  font: 500 13px 'Manrope', sans-serif;
  color: #E05252;
  padding: 10px 14px;
  background: #FFF0F0;
  border-radius: 10px;
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
  padding: 20px 0;
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
