<script setup lang="ts">
import { ref } from 'vue';
import PaxStepper from '@/components/PaxStepper.vue';
import CityInput from '@/components/CityInput.vue';
import DatePickerModal from '@/components/DatePickerModal.vue';
import { useSearchModel } from './model';

const {
  store,
  displayDate,
  minDate,
  highlightedDates,
  onCityInput,
  onDateChange,
  swap,
  search,
} = useSearchModel();

const dateModalOpen = ref(false);
</script>

<template>
  <div class="search-widget">
    <!-- Route -->
    <div class="search-widget__route">
      <CityInput
        :model-value="store.fromCity"
        label="Откуда"
        icon="trip_origin"
        placeholder="Город отправления"
        @update:model-value="onCityInput('from', $event)"
      />
      <div class="search-widget__divider"></div>
      <CityInput
        :model-value="store.toCity"
        label="Куда"
        icon="place"
        placeholder="Город назначения"
        @update:model-value="onCityInput('to', $event)"
      />
      <button class="search-widget__swap" @click.stop="swap" aria-label="Поменять города местами">
        <span class="ms">swap_vert</span>
      </button>
    </div>

    <!-- Date + Pax -->
    <div class="search-widget__bottom">
      <button type="button" class="search-widget__date" @click="dateModalOpen = true">
        <div class="search-widget__label">Дата</div>
        <div class="search-widget__date-value">{{ displayDate }}</div>
      </button>
      <PaxStepper
        :model-value="store.pax"
        @update:model-value="store.setPax($event)"
        :min="1"
        :max="20"
      />
    </div>

    <button class="search-widget__btn" @click="search">
      <span class="ms">search</span>
      Найти рейсы
    </button>

    <DatePickerModal
      v-model:open="dateModalOpen"
      :model-value="store.date"
      :min-date="minDate"
      :highlighted-dates="highlightedDates"
      @update:model-value="onDateChange"
    />
  </div>
</template>

<style scoped>
.search-widget {
  margin: 16px 16px 0;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 20px;
  box-shadow: 0 14px 34px -18px rgba(20, 30, 10, 0.25);
  padding: 8px;
}

@media (min-width: 768px) {
  .search-widget {
    margin: 16px 0 0;
  }
}

.search-widget__route {
  position: relative;
}

.search-widget__divider {
  height: 1px;
  background: #EEF0EC;
  margin-left: 46px;
}

.search-widget__swap {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #E7E9E5;
  background: #fff;
  color: var(--eg-green);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
  font-size: 20px;
}

.search-widget__bottom {
  display: flex;
  gap: 8px;
  padding: 8px 6px 0;
  align-items: stretch;
}

.search-widget__date {
  flex: 1;
  background: var(--eg-bg-subtle, #EEF6E6);
  border-radius: 14px;
  padding: 11px 14px;
  border: none;
  text-align: left;
  cursor: pointer;
  font: inherit;
}

.search-widget__date:active {
  opacity: 0.85;
}

.search-widget__label {
  font: 600 11px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.search-widget__date-value {
  font: 700 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
  margin-top: 2px;
}

.search-widget__btn {
  width: 100%;
  margin-top: 8px;
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

.search-widget__btn .ms {
  font-size: 21px;
}

.search-widget__btn:active {
  opacity: 0.9;
}
</style>
