<script setup lang="ts">
import { computed } from 'vue';
import { formatMoney } from '@easygo/shared';
import { useBookingStore } from '../stores/booking.js';
import { useRouter } from 'vue-router';

const props = defineProps<{
  fromCity: string;
  toCity: string;
  duration?: string;
  price?: number;
}>();

const store = useBookingStore();
const router = useRouter();

function pick() {
  store.setRoute(props.fromCity, props.toCity);
  void router.push('/results');
}

const priceLabel = computed(() =>
  props.price !== undefined ? formatMoney(props.price) : ''
);
</script>

<template>
  <button class="route-card eg-card" @click="pick">
    <span class="route-card__icon ms-wrap">
      <span class="ms">route</span>
    </span>
    <div class="route-card__info">
      <div class="route-card__title">{{ fromCity }} → {{ toCity }}</div>
      <div class="route-card__meta">{{ duration ?? '~4 ч · ежедневно' }}</div>
    </div>
    <div class="route-card__price" v-if="priceLabel">
      <div class="route-card__price-value">{{ priceLabel }}</div>
      <div class="route-card__price-label">/ место</div>
    </div>
  </button>
</template>

<style scoped>
.route-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 14px;
  cursor: pointer;
}

.route-card__icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--eg-green-light);
  color: var(--eg-green);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 22px;
}

.ms-wrap {
  font-family: inherit;
}

.route-card__info {
  flex: 1;
}

.route-card__title {
  font: 700 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.route-card__meta {
  font: 500 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-top: 2px;
}

.route-card__price {
  text-align: right;
  flex-shrink: 0;
}

.route-card__price-value {
  font: 800 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.route-card__price-label {
  font: 600 11px 'Manrope', sans-serif;
  color: var(--eg-green);
}
</style>
