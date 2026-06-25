<script setup lang="ts">
import PaxStepper from '@/components/PaxStepper.vue';
import { useSearchModel } from './model';

const {
  store,
  displayDate,
  pickCity,
  swap,
  search,
} = useSearchModel();
</script>

<template>
  <div class="search-widget">
    <div class="search-widget__route">
      <button type="button" class="search-widget__field" @click="pickCity('from')">
        <span class="ms search-widget__icon search-widget__icon--green">trip_origin</span>
        <div class="search-widget__field-content">
          <div class="search-widget__label">Откуда</div>
          <div class="search-widget__value">{{ store.fromCity }}</div>
        </div>
      </button>
      <div class="search-widget__divider"></div>
      <button type="button" class="search-widget__field" @click="pickCity('to')">
        <span class="ms search-widget__icon">place</span>
        <div class="search-widget__field-content">
          <div class="search-widget__label">Куда</div>
          <div class="search-widget__value">{{ store.toCity }}</div>
        </div>
      </button>
      <button class="search-widget__swap" @click.stop="swap" aria-label="Поменять города местами">
        <span class="ms">swap_vert</span>
      </button>
    </div>

    <div class="search-widget__bottom">
      <div class="search-widget__date">
        <div class="search-widget__label">Дата</div>
        <div class="search-widget__date-value">{{ displayDate }}</div>
      </div>
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

.search-widget__route {
  position: relative;
}

.search-widget__field {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 56px 13px 14px;
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: 12px;
  font: inherit;
  color: inherit;
}

.search-widget__field:active {
  background: #fafbf9;
}

.search-widget__icon {
  font-size: 20px;
  color: var(--eg-ink);
  flex-shrink: 0;
}

.search-widget__icon--green {
  color: var(--eg-green);
}

.search-widget__field-content {
  flex: 1;
}

.search-widget__label {
  font: 600 11px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.search-widget__value {
  font: 700 16px 'Manrope', sans-serif;
  color: var(--eg-ink);
  margin-top: 1px;
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
  background: var(--eg-bg-subtle);
  border-radius: 14px;
  padding: 11px 14px;
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
  font-size: 20px;
}

.search-widget__btn .ms {
  font-size: 21px;
}

.search-widget__btn:active {
  opacity: 0.9;
}
</style>
