<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import { useRouter } from 'vue-router';
import type { Car } from '@easygo/shared';
import { api } from '../lib/api.js';
import { ApiError } from '@easygo/api-client';
import { useBookingStore } from '../stores/booking.js';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorBanner from '../components/ErrorBanner.vue';

const router = useRouter();
const booking = useBookingStore();

const cars = ref<Car[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

/** Tap a city → preset it as the origin and go to search. */
function rideFrom(city: string): void {
  booking.setRoute(city, city === 'Бишкек' ? 'Алматы' : 'Бишкек');
  void router.push('/tabs/home');
}

onMounted(async () => {
  loading.value = true;
  try {
    cars.value = await api.fleet.available();
  } catch (err) {
    if (err instanceof ApiError) {
      error.value = err.message;
    } else {
      error.value = 'Не удалось загрузить данные о транспорте';
    }
  } finally {
    loading.value = false;
  }
});

// Group cars by city
function carsByCity(cityName: string): Car[] {
  return cars.value.filter(c => c.locationCity === cityName || (!c.locationCity && cityName === 'Бишкек'));
}

const cities = ['Бишкек', 'Алматы'];
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
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
              class="avail-car"
            >
              <span class="avail-car__icon ms-wrap">
                <span class="ms">directions_car</span>
              </span>
              <div class="avail-car__info">
                <div class="avail-car__name">{{ car.model }}</div>
                <div class="avail-car__type">Минивэн · комфорт</div>
              </div>
              <div class="avail-car__seats">
                <div class="avail-car__seats-num">{{ car.seats }}</div>
                <div class="avail-car__seats-label">мест</div>
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
    </IonContent>
  </IonPage>
</template>

<style scoped>
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
</style>
