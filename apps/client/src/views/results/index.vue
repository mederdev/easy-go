<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import TripCard from '@/components/TripCard.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import DatePickerModal from '@/components/DatePickerModal.vue';
import { useResultsModel } from './model';

const {
  router,
  store,
  dateStrip,
  flights,
  loading,
  error,
  choose,
  selectDate,
  routeTitle,
  paxLabelVal,
  highlightedDates,
  customFormOpen,
  customPhone,
  customComment,
  customSubmitting,
  customSuccess,
  customError,
  openCustomForm,
  submitCustomRequest,
  closeCustomForm,
} = useResultsModel();

const calendarOpen = ref(false);
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
        <!-- Header -->
        <div class="results-header">
          <button class="back-btn" @click="router.back()">
            <span class="ms">arrow_back</span>
          </button>
          <div>
            <div class="results-header__title">{{ routeTitle }}</div>
            <div class="results-header__sub">{{ paxLabelVal }} · KIA Carnival</div>
          </div>
        </div>

        <!-- Date strip -->
        <div class="date-strip-wrap">
          <div class="date-strip">
            <button
              v-for="d in dateStrip"
              :key="d.iso"
              :class="['date-chip', store.date === d.iso && 'date-chip--active']"
              @click="selectDate(d.iso)"
            >
              <span class="date-chip__day">{{ d.day }}</span>
              <span class="date-chip__month">{{ d.month }}</span>
              <span
                class="date-chip__dot"
                :style="d.hasFlights ? 'opacity:1' : 'opacity:0'"
              ></span>
            </button>
          </div>

          <!-- sticky calendar button -->
          <button class="date-cal-btn" @click="calendarOpen = true" aria-label="Выбрать дату">
            <span class="ms">calendar_month</span>
          </button>
        </div>

        <DatePickerModal
          v-model:open="calendarOpen"
          :model-value="store.date"
          :min-date="dateStrip[0]?.iso"
          :highlighted-dates="highlightedDates"
          @update:model-value="selectDate"
        />

        <!-- Content -->
        <div class="results-list">
          <LoadingSpinner v-if="loading" label="Ищем рейсы..." />
          <ErrorBanner v-else-if="error" :message="error" />
          <template v-else-if="flights.length > 0">
            <TripCard
              v-for="flight in flights"
              :key="flight.id"
              :flight="flight"
              @choose="choose"
            />
          </template>

          <!-- Empty state with inline custom-request CTA -->
          <div v-else class="results-empty">
            <span class="ms results-empty__icon">search_off</span>
            <div class="results-empty__text">Рейсов на выбранную дату не найдено</div>
          </div>
        </div>

        <!-- Always-visible custom-request card at the bottom -->
        <button class="custom-cta custom-cta--inline" @click="openCustomForm">
          <span class="ms custom-cta__icon">support_agent</span>
          <div class="custom-cta__body">
            <span class="custom-cta__label">Нет подходящего рейса?</span>
            <span class="custom-cta__hint">Оставьте заявку — оператор перезвонит в WhatsApp</span>
          </div>
          <span class="ms custom-cta__arrow">chevron_right</span>
        </button>

        <div style="height: 32px"></div>
      </div>

      <!-- Custom request modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="customFormOpen" class="modal-overlay" @click.self="closeCustomForm">
            <div class="modal-sheet">
              <!-- Success state -->
              <div v-if="customSuccess" class="modal-success">
                <span class="ms modal-success__icon">check_circle</span>
                <div class="modal-success__title">Заявка отправлена!</div>
                <div class="modal-success__text">Оператор свяжется с вами в WhatsApp в ближайшее время.</div>
                <button class="btn-primary" @click="closeCustomForm">Закрыть</button>
              </div>

              <!-- Form state -->
              <template v-else>
                <div class="modal-header">
                  <div class="modal-title">Индивидуальная заявка</div>
                  <button class="modal-close" @click="closeCustomForm">
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
                  <label class="field">
                    <span class="field__label">Номер телефона (WhatsApp)</span>
                    <input
                      v-model="customPhone"
                      class="field__input"
                      type="tel"
                      placeholder="+996 700 000 000"
                      inputmode="tel"
                    />
                  </label>

                  <label class="field">
                    <span class="field__label">Комментарий (необязательно)</span>
                    <textarea
                      v-model="customComment"
                      class="field__input field__textarea"
                      placeholder="Желаемое время, особые пожелания..."
                      rows="3"
                    ></textarea>
                  </label>

                  <div v-if="customError" class="modal-error">{{ customError }}</div>

                  <button
                    class="btn-primary"
                    :disabled="customSubmitting"
                    @click="submitCustomRequest"
                  >
                    {{ customSubmitting ? 'Отправка...' : 'Отправить заявку' }}
                  </button>
                </div>
              </template>
            </div>
          </div>
        </Transition>
      </Teleport>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .results-header { padding: 20px 0 12px; }
  .date-strip-wrap { padding: 2px 0 12px; }
  .results-list { padding: 0; }
  .custom-cta--bar { margin: 16px 0; }
}

.results-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px 12px;
}

.back-btn {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid #E7E9E5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  flex-shrink: 0;
}

.results-header__title {
  font: 800 18px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.results-header__sub {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-top: 2px;
}

.date-strip-wrap {
  position: relative;
  padding: 2px 0 12px;
  display: flex;
  align-items: center;
}

.date-strip {
  flex: 1;
  display: flex;
  gap: 8px;
  padding: 0 8px 0 16px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x mandatory;
}

.date-strip::-webkit-scrollbar { display: none; }

.date-chip {
  flex-shrink: 0;
  scroll-snap-align: start;
  min-width: 58px;
  padding: 8px 6px 6px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: #F2F3F0;
  color: var(--eg-muted);
  transition: background 0.15s, color 0.15s;
}

.date-chip--active {
  background: var(--eg-ink);
  color: #fff;
}

.date-chip__day {
  font: 700 16px 'Manrope', sans-serif;
  line-height: 1;
}

.date-chip__month {
  font: 500 11px 'Manrope', sans-serif;
  line-height: 1;
  text-transform: lowercase;
}

.date-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--eg-green);
  margin-top: 2px;
  transition: opacity 0.15s;
}

.date-chip--active .date-chip__dot {
  background: #fff;
}

/* Sticky calendar button — always visible on the right */
.date-cal-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: none;
  background: #EEF6E6;
  color: var(--eg-green);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-right: 12px;
  box-shadow: -8px 0 12px 4px #F5F6F3;
}

.results-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Empty state ── */
.results-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0 8px;
}

.results-empty__icon {
  font-size: 48px;
  color: #D0D4CC;
}

.results-empty__text {
  font: 600 14px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  text-align: center;
}

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

/* Inline variant inside the empty state */
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

/* Bar variant always at bottom */
.custom-cta--bar {
  margin: 16px 16px 0;
  padding: 14px 16px;
  background: #EEF6E6;
  border-radius: 16px;
}

.custom-cta--bar .custom-cta__icon {
  font-size: 24px;
  color: var(--eg-green);
  flex-shrink: 0;
}

.custom-cta--bar .custom-cta__label {
  font: 700 13px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.custom-cta--bar .custom-cta__hint {
  font: 500 12px 'Manrope', sans-serif;
  color: var(--eg-muted);
  margin-top: 2px;
}

.custom-cta--bar .custom-cta__arrow {
  font-size: 20px;
  color: var(--eg-green);
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
