<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import TripCard from '@/components/TripCard.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useResultsModel } from './model';

const {
  router,
  activeDay,
  flights,
  loading,
  error,
  choose,
  routeTitle,
  paxLabelVal,
  setDay,
} = useResultsModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
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

      <!-- Day tabs -->
      <div class="results-tabs">
        <button
          :class="['seg-btn', activeDay === 'today' && 'seg-btn--active']"
          @click="setDay('today')"
        >Сегодня</button>
        <button
          :class="['seg-btn', activeDay === 'tomorrow' && 'seg-btn--active']"
          @click="setDay('tomorrow')"
        >Завтра</button>
      </div>

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
        <div v-else class="results-empty">
          <span class="ms results-empty__icon">search_off</span>
          <div class="results-empty__text">Рейсов на выбранную дату не найдено</div>
        </div>
      </div>

      <!-- Custom request banner -->
      <div class="results-custom">
        <span class="ms" style="color: var(--eg-green); font-size: 20px">add_circle</span>
        <div class="results-custom__text">
          Нет подходящего времени?
          <b style="color: var(--eg-ink)">Оставьте индивидуальную заявку</b>
        </div>
      </div>

      <div style="height: 32px"></div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
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

.results-tabs {
  display: flex;
  gap: 8px;
  padding: 2px 16px 12px;
}

.seg-btn {
  flex: 1;
  height: 40px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
  font: 700 13.5px 'Manrope', sans-serif;
  background: #F2F3F0;
  color: var(--eg-muted);
  transition: background 0.15s, color 0.15s;
}

.seg-btn--active {
  background: var(--eg-ink);
  color: #fff;
}

.results-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.results-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
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

.results-custom {
  margin: 16px;
  padding: 14px 16px;
  border: 1px dashed #D8DBD3;
  border-radius: 14px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.results-custom__text {
  font: 500 13px/1.4 'Manrope', sans-serif;
  color: var(--eg-muted);
}
</style>
