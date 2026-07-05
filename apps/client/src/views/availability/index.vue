<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import CityInput from '@/components/CityInput.vue';
import { useAvailabilityModel } from './model';

const {
  cars,
  loading,
  error,
  rideFrom,
  carsByCity,
  cities,
  typeLabel,
  featureLabels,
  otherOpen,
  otherFrom,
  otherTo,
  closeOther,
  confirmOther,
} = useAvailabilityModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
      <div class="avail-header">
        <h1 class="avail-header__title">Свободный транспорт</h1>
        <p class="avail-header__sub">Актуальное наличие по основным локациям</p>
      </div>

      <div class="avail-list">
        <LoadingSpinner v-if="loading" label="Загрузка..." />
        <ErrorBanner v-else-if="error" :message="error" />

        <template v-else-if="cars.length > 0">
          <div
            v-for="city in cities"
            :key="city"
            class="avail-city-card"
          >
            <div class="avail-city-header">
              <div class="avail-city-name">
                <span class="ms" style="color: var(--eg-green); font-size: 20px">location_on</span>
                <span class="avail-city-name__text">{{ city }}</span>
              </div>
              <span class="avail-city-badge">Свободно</span>
            </div>
            <div
              v-for="car in carsByCity(city)"
              :key="car.id"
              class="avail-car avail-car--rich"
            >
              <div class="avail-car__row">
                <span class="avail-car__icon ms-wrap">
                  <span class="ms">directions_car</span>
                </span>
                <div class="avail-car__info">
                  <div class="avail-car__name">{{ car.model }}</div>
                  <div class="avail-car__type">{{ typeLabel(car) }}</div>
                  <div class="avail-car__plate">{{ car.plate }}</div>
                </div>
                <div class="avail-car__seats">
                  <div class="avail-car__seats-num">{{ car.seats }}</div>
                  <div class="avail-car__seats-label">мест</div>
                </div>
              </div>
              <div v-if="featureLabels(car).length" class="avail-car__features">
                <span
                  v-for="feature in featureLabels(car)"
                  :key="feature"
                  class="avail-car__feature"
                >{{ feature }}</span>
              </div>
            </div>
            <button class="avail-cta" @click="rideFrom(city)">
              Поехать из «{{ city }}»
              <span class="ms">arrow_forward</span>
            </button>
          </div>
        </template>

        <!-- Static fallback matching the mock -->
        <template v-else>
          <div class="avail-city-card">
            <div class="avail-city-header">
              <div class="avail-city-name">
                <span class="ms" style="color: var(--eg-green); font-size: 20px">location_on</span>
                <span class="avail-city-name__text">Бишкек</span>
              </div>
              <span class="avail-city-badge">Свободно</span>
            </div>
            <div class="avail-car">
              <span class="avail-car__icon ms-wrap">
                <span class="ms">directions_car</span>
              </span>
              <div class="avail-car__info">
                <div class="avail-car__name">KIA Carnival</div>
                <div class="avail-car__type">Минивэн · комфорт</div>
              </div>
              <div class="avail-car__seats">
                <div class="avail-car__seats-num">11</div>
                <div class="avail-car__seats-label">мест</div>
              </div>
            </div>
            <button class="avail-cta" @click="rideFrom('Бишкек')">
              Поехать из «Бишкек»
              <span class="ms">arrow_forward</span>
            </button>
          </div>

          <div class="avail-city-card">
            <div class="avail-city-header">
              <div class="avail-city-name">
                <span class="ms" style="color: var(--eg-green); font-size: 20px">location_on</span>
                <span class="avail-city-name__text">Алматы</span>
              </div>
              <span class="avail-city-badge">Свободно</span>
            </div>
            <div class="avail-car">
              <span class="avail-car__icon ms-wrap">
                <span class="ms">directions_car</span>
              </span>
              <div class="avail-car__info">
                <div class="avail-car__name">KIA Carnival</div>
                <div class="avail-car__type">Минивэн · комфорт</div>
              </div>
              <div class="avail-car__seats">
                <div class="avail-car__seats-num">8</div>
                <div class="avail-car__seats-label">мест</div>
              </div>
            </div>
            <button class="avail-cta" @click="rideFrom('Алматы')">
              Поехать из «Алматы»
              <span class="ms">arrow_forward</span>
            </button>
          </div>
        </template>

        <div class="avail-note">
          <span class="ms" style="color: #3E7C12; font-size: 20px">verified_user</span>
          <div class="avail-note__text">Весь транспорт — собственный автопарк EasyGo</div>
        </div>
      </div>

      <div style="height: 32px"></div>
      </div>

      <!-- "Другой город" — destination search with live suggestions -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="otherOpen" class="modal-overlay" @click.self="closeOther">
            <div class="other-sheet">
              <div class="other-header">
                <div class="other-title">Куда поедем из «{{ otherFrom }}»?</div>
                <button class="other-close" @click="closeOther" aria-label="Закрыть">
                  <span class="ms">close</span>
                </button>
              </div>
              <div class="other-input">
                <CityInput
                  :model-value="otherTo"
                  label="Куда"
                  icon="place"
                  placeholder="Город назначения"
                  @update:model-value="otherTo = $event"
                />
              </div>
              <button class="other-btn" :disabled="!otherTo.trim()" @click="confirmOther">
                <span class="ms">search</span>
                Найти рейсы
              </button>
            </div>
          </div>
        </Transition>
      </Teleport>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .avail-header { padding: 20px 0 4px; }
  .avail-list {
    padding: 16px 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .avail-note { grid-column: 1 / -1; }
}

.avail-header {
  padding: 12px 18px 4px;
}

.avail-header__title {
  margin: 0;
  font: 800 23px 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}

.avail-header__sub {
  margin: 6px 0 0;
  font: 500 13px 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.avail-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avail-city-card {
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 18px;
  padding: 16px 18px;
}

.avail-city-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.avail-city-name {
  display: flex;
  align-items: center;
  gap: 9px;
}

.avail-city-name__text {
  font: 800 17px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.avail-city-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--eg-green-light);
  color: var(--eg-green-accent);
  font: 700 12px 'Manrope', sans-serif;
}

.avail-car {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px;
  background: var(--eg-bg-subtle);
  border-radius: 13px;
}

/* Dynamic cards stack a feature row under the main row */
.avail-car--rich {
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}

.avail-car__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avail-car__plate {
  display: inline-block;
  margin-top: 5px;
  padding: 2px 8px;
  border: 1px solid #D9DDD4;
  border-radius: 6px;
  background: #fff;
  font: 700 11px 'Manrope', sans-serif;
  letter-spacing: 0.06em;
  color: var(--eg-ink);
  text-transform: uppercase;
}

.avail-car__features {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.avail-car__feature {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--eg-green-light);
  color: var(--eg-green-accent);
  font: 600 11px 'Manrope', sans-serif;
}

.avail-car__icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--eg-ink);
  color: var(--eg-green-bright);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.ms-wrap {
  font-family: inherit;
}

.avail-car__info {
  flex: 1;
}

.avail-car__name {
  font: 700 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.avail-car__type {
  font: 500 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-top: 2px;
}

.avail-car__seats {
  text-align: right;
}

.avail-car__seats-num {
  font: 800 20px 'Manrope', sans-serif;
  color: var(--eg-green);
}

.avail-car__seats-label {
  font: 600 10px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  text-transform: uppercase;
}

.avail-note {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 16px;
  background: var(--eg-green-light);
  border-radius: 14px;
}

.avail-note__text {
  font: 600 13px/1.4 'Manrope', sans-serif;
  color: var(--eg-green-accent);
}

.avail-cta {
  width: 100%;
  margin-top: 12px;
  height: 48px;
  border: none;
  border-radius: 13px;
  background: var(--eg-green);
  color: #fff;
  font: 700 14px 'Manrope', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.avail-cta .ms {
  font-size: 19px;
}

/* ── "Другой город" destination sheet ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(22, 24, 28, 0.55);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.other-sheet {
  width: 100%;
  max-width: 500px;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 20px 20px 40px;
}

.other-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.other-title {
  font: 800 17px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.other-close {
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
  flex-shrink: 0;
}

.other-input {
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  /* Room below for the CityInput suggestion dropdown to open into. */
  margin-bottom: 220px;
}

.other-btn {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 15px;
  background: var(--eg-green);
  color: #fff;
  font: 700 16px 'Manrope', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.other-btn .ms {
  font-size: 21px;
}

.other-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

/* Sheet transition (matches the app's modal pattern) */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s;
}

.modal-enter-active .other-sheet,
.modal-leave-active .other-sheet {
  transition: transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .other-sheet,
.modal-leave-to .other-sheet {
  transform: translateY(100%);
}
</style>
