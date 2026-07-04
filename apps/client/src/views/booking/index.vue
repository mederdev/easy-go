<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import CustomRequestCta from '@/components/CustomRequestCta.vue';
import { useBookingModel } from './model';

const {
  router,
  store,
  name,
  phone,
  whatsappSame,
  comment,
  nameError,
  phoneError,
  routeTitle,
  departDateLabel,
  departTime,
  totalLabel,
  maxPax,
  submit,
  stops,
  stopsError,
  addStop,
  removeStop,
  stopPriceHint,
  canAddStop,
} = useBookingModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
      <!-- Header -->
      <div class="booking-header">
        <button class="back-btn" @click="router.back()">
          <span class="ms">arrow_back</span>
        </button>
        <div class="booking-header__title">Оформление заявки</div>
      </div>

      <!-- Trip Summary Card -->
      <div class="booking-summary">
        <div class="booking-summary__route">{{ routeTitle }}</div>
        <div class="booking-summary__meta">
          <div class="booking-summary__meta-item">
            <div class="booking-summary__meta-label">Дата</div>
            <div class="booking-summary__meta-value">{{ departDateLabel }}</div>
          </div>
          <div class="booking-summary__meta-item">
            <div class="booking-summary__meta-label">Время</div>
            <div class="booking-summary__meta-value">{{ departTime }}</div>
          </div>
          <div class="booking-summary__meta-item">
            <div class="booking-summary__meta-label">Авто</div>
            <div class="booking-summary__meta-value">KIA Carnival</div>
          </div>
        </div>
      </div>

      <!-- Passengers -->
      <div class="booking-section-title">Пассажиры</div>
      <div class="booking-pax">
        <span class="booking-pax__label">Количество мест</span>
        <div class="pax-row">
          <button
            class="pax-btn pax-btn--minus"
            @click="store.setPax(store.pax - 1)"
            :disabled="store.pax <= 1"
          >
            <span class="ms">remove</span>
          </button>
          <div class="pax-num">{{ store.pax }}</div>
          <button
            class="pax-btn pax-btn--plus"
            @click="store.setPax(store.pax + 1)"
            :disabled="store.pax >= maxPax"
          >
            <span class="ms">add</span>
          </button>
        </div>
      </div>
      <!-- <div class="booking-pax-hint">На этом рейсе осталось {{ maxPax }} мест</div> -->

      <!-- Contact Details -->
      <div class="booking-section-title">Контактные данные</div>
      <div class="booking-fields">
        <div class="field-group">
          <label class="field-label">Имя</label>
          <input
            v-model="name"
            placeholder="Ваше имя"
            class="field-input"
            :class="nameError && 'field-input--error'"
            type="text"
            autocomplete="name"
          />
          <div v-if="nameError" class="field-error">{{ nameError }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">Телефон</label>
          <input
            v-model="phone"
            placeholder="+996 700 000 000"
            class="field-input"
            :class="phoneError && 'field-input--error'"
            type="tel"
            autocomplete="tel"
          />
          <div v-if="phoneError" class="field-error">{{ phoneError }}</div>
        </div>

        <label class="whatsapp-checkbox">
          <span class="whatsapp-checkbox__icon ms-wrap" :class="whatsappSame && 'whatsapp-checkbox__icon--checked'">
            <span class="ms">{{ whatsappSame ? 'check' : 'square' }}</span>
          </span>
          <input type="checkbox" v-model="whatsappSame" class="sr-only" />
          Этот номер используется в WhatsApp
        </label>

        <div class="field-group">
          <label class="field-label">
            Комментарий <span class="field-optional">(необязательно)</span>
          </label>
          <textarea
            v-model="comment"
            placeholder="Багаж, детское кресло, адрес подачи…"
            class="field-textarea"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Pickup / dropoff points -->
      <div class="booking-section-title">Точки сбора и развоза</div>
      <div class="stops">
        <div v-for="(s, i) in stops" :key="i" class="stop-row"
             :class="{ 'stop-row--error': stopsError && !s.address.trim() }">
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
            class="field-input stop-address"
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
          Максимум {{ store.pax }} точек сбора и {{ store.pax }} развоза — по одной каждого типа на пассажира.
        </div>

        <div v-if="stopsError" class="field-error">{{ stopsError }}</div>

        <div class="stop-note">
          За каждую точку взимается доплата — итоговую цену подтвердит оператор при связи с вами.
          <template v-if="stopPriceHint"> {{ stopPriceHint }}</template>
        </div>
      </div>

      <!-- Error -->
      <ErrorBanner v-if="store.submitError" :message="store.submitError" style="margin-top: 12px" />

      <!-- Total + Submit -->
      <div class="booking-total">
        <div>
          <div class="booking-total__label">Итого</div>
          <div class="booking-total__value">{{ totalLabel }}</div>
        </div>
        <button
          class="booking-total__btn"
          :disabled="store.submitting"
          @click="submit"
        >
          {{ store.submitting ? 'Отправка...' : 'Отправить заявку' }}
          <span class="ms">arrow_forward</span>
        </button>
      </div>

      <!-- Not enough seats / want another car or time? — individual request -->
      <CustomRequestCta
        label="Не хватает мест или нужна другая машина?"
        hint="Оставьте индивидуальную заявку — подберём машину и время под вас"
      />

      <div style="height: 32px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .booking-header { padding: 20px 0 12px; }
  .booking-summary { margin: 0; }
  .booking-pax { margin: 0; }
  .booking-fields { padding: 0; }
  .booking-total { margin: 18px 0 0; }
  .stops { padding: 0; }
}

/* ── Pickup/dropoff points ── */
.stops {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  border-color: #C0492E;
}

.stop-limit {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  text-align: center;
  padding: 2px 0;
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
  height: 46px;
  border: 1.5px dashed #C9D6BC;
  border-radius: 12px;
  background: #F7FAF3;
  color: var(--eg-green);
  font: 700 14px 'Manrope', sans-serif;
  cursor: pointer;
}

.stop-add .ms {
  font-size: 20px;
}

.stop-note {
  font: 500 12px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
  background: var(--eg-bg-subtle);
  border-radius: 12px;
  padding: 10px 12px;
}

.booking-header {
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

.booking-header__title {
  font: 800 18px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.booking-summary {
  margin: 0 16px;
  background: var(--eg-ink);
  border-radius: 18px;
  padding: 16px 18px;
  color: #fff;
}

.booking-summary__route {
  font: 800 17px 'Manrope', sans-serif;
  color: #fff;
}

.booking-summary__meta {
  display: flex;
  gap: 18px;
  margin-top: 10px;
}

.booking-summary__meta-label {
  font: 600 10px 'Manrope', sans-serif;
  color: #8B918A;
  text-transform: uppercase;
}

.booking-summary__meta-value {
  font: 700 14px 'Manrope', sans-serif;
  color: #fff;
}

.booking-section-title {
  padding: 18px 16px 8px;
  font: 800 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.booking-pax {
  margin: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--eg-bg-subtle);
  border-radius: 14px;
  padding: 10px 14px;
}

.booking-pax__label {
  font: 600 14px 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.booking-pax-hint {
  margin: 6px 16px 0;
  font: 600 12px 'Manrope', sans-serif;
  color: #C0492E;
}

.pax-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pax-btn {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}

.pax-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pax-btn--minus {
  background: #fff;
  color: var(--eg-ink);
}

.pax-btn--plus {
  background: var(--eg-green);
  color: #fff;
}

.pax-num {
  font: 800 18px 'Manrope', sans-serif;
  min-width: 24px;
  text-align: center;
  color: var(--eg-ink);
}

.booking-fields {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-group {
  display: flex;
  flex-direction: column;
}

.field-label {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-bottom: 5px;
}

.field-optional {
  color: #C4C8C0;
}

.field-input {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border: 1px solid #E2E5DF;
  border-radius: 12px;
  font: 500 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--eg-green);
}

.field-input--error {
  border-color: #C0492E;
}

.field-error {
  font: 600 11px 'Manrope', sans-serif;
  color: #C0492E;
  margin-top: 4px;
}

.field-textarea {
  width: 100%;
  height: 84px;
  padding: 12px 14px;
  border: 1px solid #E2E5DF;
  border-radius: 12px;
  font: 500 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
  outline: none;
  resize: none;
  background: #fff;
  transition: border-color 0.15s;
}

.field-textarea:focus {
  border-color: var(--eg-green);
}

.whatsapp-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 2px;
  font: 600 13px 'Manrope', sans-serif;
  color: var(--eg-muted);
  cursor: pointer;
}

.whatsapp-checkbox__icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid #D0D4CC;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.whatsapp-checkbox__icon--checked {
  background: var(--eg-green);
  border-color: var(--eg-green);
  color: #fff;
}

.ms-wrap {
  font-family: inherit;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.booking-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 16px 0;
  padding: 14px 16px;
  background: var(--eg-bg-subtle);
  border-radius: 14px;
}

.booking-total__label {
  font: 600 11px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  text-transform: uppercase;
}

.booking-total__value {
  font: 800 22px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.booking-total__btn {
  height: 54px;
  padding: 0 26px;
  border: none;
  border-radius: 15px;
  background: var(--eg-green);
  color: #fff;
  font: 700 16px 'Manrope', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.booking-total__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.booking-total__btn .ms {
  font-size: 20px;
}
</style>
