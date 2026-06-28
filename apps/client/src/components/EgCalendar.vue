<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface HighlightedDate {
  date: string;
  textColor?: string;
  backgroundColor?: string;
}

const props = defineProps<{
  modelValue: string;        // YYYY-MM-DD
  minDate?: string;
  highlightedDates?: HighlightedDate[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DOW   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function parseIso(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return { year: d.getFullYear(), month: d.getMonth() };
}

const today = new Date().toISOString().slice(0, 10);
const initial = parseIso(props.modelValue);
const viewYear  = ref(initial.year);
const viewMonth = ref(initial.month); // 0-based

// Sync view when the external value jumps to a different month
watch(() => props.modelValue, (iso) => {
  const { year, month } = parseIso(iso);
  viewYear.value  = year;
  viewMonth.value = month;
});

const monthLabel = computed(() => `${MONTHS[viewMonth.value]} ${viewYear.value}`);

const highlightedSet = computed(() =>
  new Set((props.highlightedDates ?? []).map((h) => h.date)),
);

// Grid cells: null = padding, number = day-of-month
const cells = computed<(number | null)[]>(() => {
  const y = viewYear.value;
  const m = viewMonth.value;
  const firstDow = new Date(y, m, 1).getDay();       // 0=Sun
  const leadingNulls = firstDow === 0 ? 6 : firstDow - 1; // align to Mon
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const arr: (number | null)[] = Array(leadingNulls).fill(null);
  for (let d = 1; d <= daysInMonth; d++) arr.push(d);
  while (arr.length % 7 !== 0) arr.push(null);
  return arr;
});

function isoFor(day: number): string {
  return `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isDisabled(day: number) {
  return !!props.minDate && isoFor(day) < props.minDate;
}

function select(day: number | null) {
  if (!day || isDisabled(day)) return;
  emit('update:modelValue', isoFor(day));
}

function prevMonth() {
  if (viewMonth.value === 0) { viewYear.value--; viewMonth.value = 11; }
  else viewMonth.value--;
}
function nextMonth() {
  if (viewMonth.value === 11) { viewYear.value++; viewMonth.value = 0; }
  else viewMonth.value++;
}
</script>

<template>
  <div class="cal">
    <!-- Navigation -->
    <div class="cal__nav">
      <button class="cal__arrow" @click="prevMonth">
        <span class="ms">chevron_left</span>
      </button>
      <span class="cal__month">{{ monthLabel }}</span>
      <button class="cal__arrow" @click="nextMonth">
        <span class="ms">chevron_right</span>
      </button>
    </div>

    <!-- Day-of-week header -->
    <div class="cal__dow">
      <span v-for="d in DOW" :key="d">{{ d }}</span>
    </div>

    <!-- Day grid -->
    <div class="cal__grid">
      <button
        v-for="(day, i) in cells"
        :key="i"
        class="cal__cell"
        :class="{
          'cal__cell--selected': day !== null && isoFor(day) === modelValue,
          'cal__cell--today':    day !== null && isoFor(day) === today,
          'cal__cell--disabled': day !== null && isDisabled(day),
        }"
        :disabled="day === null || isDisabled(day)"
        :tabindex="day === null ? -1 : 0"
        @click="select(day)"
      >
        <span v-if="day !== null" class="cal__num">{{ day }}</span>
        <!-- flight dot -->
        <span
          v-if="day !== null && highlightedSet.has(isoFor(day))"
          class="cal__dot"
        ></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.cal {
  padding: 12px 14px 8px;
  user-select: none;
}

.cal__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cal__arrow {
  width: 36px;
  height: 36px;
  border: none;
  background: #F2F3F0;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--eg-ink);
}

.cal__arrow:active { opacity: 0.7; }

.cal__month {
  font: 700 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
  text-transform: capitalize;
}

.cal__dow {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 6px;
}

.cal__dow span {
  font: 600 11px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px 0;
}

.cal__cell {
  aspect-ratio: 1;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  transition: background 0.12s;
}

.cal__cell:not(:disabled):hover {
  background: #F2F3F0;
}

.cal__cell--selected {
  background: var(--eg-ink) !important;
}

.cal__num {
  font: 600 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
  line-height: 1;
}

.cal__cell--today:not(.cal__cell--selected) .cal__num {
  color: var(--eg-green);
  font-weight: 800;
}

.cal__cell--selected .cal__num {
  color: #fff;
}

.cal__cell--disabled {
  opacity: 0.28;
  cursor: default;
}

.cal__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--eg-green);
  flex-shrink: 0;
}

.cal__cell--selected .cal__dot {
  background: rgba(255, 255, 255, 0.65);
}
</style>
