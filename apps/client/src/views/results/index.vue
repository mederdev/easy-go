<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import TripCard from '@/components/TripCard.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import DatePickerModal from '@/components/DatePickerModal.vue';
import CustomRequestCta from '@/components/CustomRequestCta.vue';
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
  onCalendarRange,
  routeTitle,
  paxLabelVal,
  highlightedDates,
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
          @visible-range="onCalendarRange"
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
        <CustomRequestCta />

        <div style="height: 32px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .results-header { padding: 20px 0 12px; }
  .date-strip-wrap { padding: 2px 0 12px; }
  .results-list { padding: 0; }
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
  padding: 2px 0 12px 16px;
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
</style>
