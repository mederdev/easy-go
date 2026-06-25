<script setup lang="ts">
import { computed } from 'vue';
import type { FlightView } from '@easygo/shared';
import { formatMoney, seatsLabel } from '@easygo/shared';

const props = defineProps<{
  flight: FlightView;
}>();

const emit = defineEmits<{
  choose: [flight: FlightView];
}>();

const departTime = computed(() => {
  const d = new Date(props.flight.departAt);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
});

const priceLabel = computed(() => {
  // route.price is in minor units per seat
  const price = props.flight.route?.price ?? 0;
  return formatMoney(price);
});

const seatChipLabel = computed(() => seatsLabel(props.flight.seatsLeft));

const seatBg = computed(() => {
  if (props.flight.soldOut) return '#FBEDEA';
  if (props.flight.fewSeats) return '#FBEDEA';
  return '#EEF6E6';
});

const seatColor = computed(() => {
  if (props.flight.soldOut) return '#C0492E';
  if (props.flight.fewSeats) return '#C0492E';
  return '#3E7C12';
});

const carLabel = computed(() => {
  if (props.flight.car) return `${props.flight.car.model} · ${props.flight.seatsTotal} мест`;
  return `${props.flight.seatsTotal} мест`;
});
</script>

<template>
  <div class="trip-card">
    <div class="trip-card__time">
      <div class="trip-card__time-value">{{ departTime }}</div>
      <div class="trip-card__time-label">отправл.</div>
    </div>
    <div class="trip-card__divider"></div>
    <div class="trip-card__middle">
      <div
        class="trip-card__seats-chip"
        :style="{ background: seatBg, color: seatColor }"
      >
        <span class="ms" style="font-size: 14px">event_seat</span>
        {{ seatChipLabel }}
      </div>
      <div class="trip-card__car">KIA Carnival · {{ flight.seatsTotal }} мест</div>
    </div>
    <div class="trip-card__right">
      <div class="trip-card__price">{{ priceLabel }}</div>
      <button
        class="trip-card__btn"
        :disabled="flight.soldOut"
        @click="emit('choose', flight)"
      >
        {{ flight.soldOut ? 'Мест нет' : 'Выбрать' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.trip-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 14px 16px;
}

.trip-card__time {
  text-align: center;
  flex-shrink: 0;
}

.trip-card__time-value {
  font: 800 20px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.trip-card__time-label {
  font: 600 10px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  text-transform: uppercase;
  margin-top: 2px;
}

.trip-card__divider {
  width: 1px;
  align-self: stretch;
  background: #EEF0EC;
  flex-shrink: 0;
}

.trip-card__middle {
  flex: 1;
}

.trip-card__seats-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 999px;
  font: 700 11px 'Manrope', sans-serif;
}

.trip-card__car {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-top: 6px;
}

.trip-card__right {
  text-align: right;
  flex-shrink: 0;
}

.trip-card__price {
  font: 800 16px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.trip-card__btn {
  margin-top: 6px;
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: var(--eg-green);
  color: #fff;
  font: 700 13px 'Manrope', sans-serif;
  cursor: pointer;
}

.trip-card__btn:disabled {
  background: #D0D4CC;
  cursor: not-allowed;
}
</style>
