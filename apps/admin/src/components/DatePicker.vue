<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

/** Brand-styled date picker: a pill trigger + custom month-grid popover.
 *  Replaces the unstylable native date popup. v-model is an ISO `YYYY-MM-DD`
 *  string (empty = no date). Russian labels, week starts Monday. */
const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  min?: string; // earliest selectable day, ISO YYYY-MM-DD
  max?: string; // latest selectable day, ISO YYYY-MM-DD
}>();
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const pad = (n: number) => String(n).padStart(2, '0');
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-based

function parse(v: string): { y: number; m: number; d: number } | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

const today = new Date();
const todayStr = toStr(today.getFullYear(), today.getMonth(), today.getDate());

const open = ref(false);
const viewYear = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());

// Snap the visible month to the selected value whenever it changes externally.
watch(
  () => props.modelValue,
  (v) => {
    const p = parse(v);
    if (p) {
      viewYear.value = p.y;
      viewMonth.value = p.m;
    }
  },
  { immediate: true },
);

const label = computed(() => {
  const p = parse(props.modelValue);
  if (!p) return props.placeholder ?? 'Все даты';
  return `${p.d} ${MONTHS_GEN[p.m]}`;
});

const monthTitle = computed(() => `${MONTHS[viewMonth.value]} ${viewYear.value}`);

interface Cell { day: number | null; dateStr?: string; isToday?: boolean; isSelected?: boolean; disabled?: boolean }

function outOfRange(ds: string): boolean {
  if (props.min && ds < props.min) return true;
  if (props.max && ds > props.max) return true;
  return false;
}

const cells = computed<Cell[]>(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first index
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate();
  const out: Cell[] = [];
  for (let i = 0; i < startDow; i++) out.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = toStr(viewYear.value, viewMonth.value, d);
    out.push({
      day: d,
      dateStr: ds,
      isToday: ds === todayStr,
      isSelected: ds === props.modelValue,
      disabled: outOfRange(ds),
    });
  }
  return out;
});

function prevMonth(): void {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value--;
  } else {
    viewMonth.value--;
  }
}
function nextMonth(): void {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value++;
  } else {
    viewMonth.value++;
  }
}
function pick(ds?: string): void {
  if (!ds || outOfRange(ds)) return;
  emit('update:modelValue', ds);
  open.value = false;
}
const todayDisabled = computed(() => outOfRange(todayStr));
function selectToday(): void {
  pick(todayStr);
}
function clear(): void {
  emit('update:modelValue', '');
  open.value = false;
}
function toggle(): void {
  open.value = !open.value;
}

// The popover is teleported to <body> and positioned with `fixed` so it can
// never be clipped by the scroll container or covered by the sidebar.
const POP_W = 288;
const root = ref<HTMLElement | null>(null);
const triggerEl = ref<HTMLElement | null>(null);
const popEl = ref<HTMLElement | null>(null);
const popStyle = ref<Record<string, string>>({});

function position(): void {
  const t = triggerEl.value;
  if (!t) return;
  const r = t.getBoundingClientRect();
  const gap = 8;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Align the popover's right edge to the trigger's right edge, then clamp into
  // the viewport so it stays fully visible on either side.
  let left = r.right - POP_W;
  if (left + POP_W > vw - margin) left = vw - margin - POP_W;
  if (left < margin) left = margin;

  const popH = popEl.value?.offsetHeight ?? 360;
  let top = r.bottom + gap;
  if (top + popH > vh - margin && r.top - gap - popH > margin) {
    top = r.top - gap - popH; // flip above when there's no room below
  }

  popStyle.value = { top: `${top}px`, left: `${left}px` };
}

async function toggleAndPosition(): Promise<void> {
  toggle();
  if (open.value) {
    await nextTick();
    position();
  }
}

function onDocPointer(e: MouseEvent): void {
  const target = e.target as Node;
  if (root.value?.contains(target)) return;
  if (popEl.value?.contains(target)) return;
  open.value = false;
}

watch(open, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDocPointer);
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
  } else {
    document.removeEventListener('mousedown', onDocPointer);
    window.removeEventListener('scroll', position, true);
    window.removeEventListener('resize', position);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocPointer);
  window.removeEventListener('scroll', position, true);
  window.removeEventListener('resize', position);
});
</script>

<template>
  <div ref="root" class="dp">
    <button
      ref="triggerEl"
      type="button"
      class="trigger"
      :class="{ active: modelValue }"
      @click="toggleAndPosition"
    >
      <span class="material-symbols-outlined cal-icon">calendar_month</span>
      <span class="trigger-text">{{ label }}</span>
      <span
        v-if="modelValue"
        class="clear"
        role="button"
        tabindex="0"
        @click.stop="clear"
        @keydown.enter.stop.prevent="clear"
      >
        <span class="material-symbols-outlined">close</span>
      </span>
      <span v-else class="material-symbols-outlined chev">expand_more</span>
    </button>

    <Teleport to="body">
      <Transition name="dp-pop">
        <div v-if="open" ref="popEl" class="popover" :style="popStyle">
          <div class="pop-head">
          <button type="button" class="nav" @click="prevMonth">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="pop-title">{{ monthTitle }}</span>
          <button type="button" class="nav" @click="nextMonth">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        <div class="weekdays">
          <span v-for="w in WEEKDAYS" :key="w" class="wd">{{ w }}</span>
        </div>

        <div class="grid">
          <template v-for="(c, i) in cells" :key="i">
            <span v-if="c.day === null" class="cell empty" />
            <button
              v-else
              type="button"
              class="cell day"
              :class="{ today: c.isToday, selected: c.isSelected, disabled: c.disabled }"
              :disabled="c.disabled"
              @click="pick(c.dateStr)"
            >
              {{ c.day }}
            </button>
          </template>
        </div>

        <div class="pop-foot">
          <button type="button" class="foot-btn" :disabled="todayDisabled" @click="selectToday">
            Сегодня
          </button>
          <button type="button" class="foot-btn ghost" :disabled="!modelValue" @click="clear">
            Сбросить
          </button>
        </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dp {
  position: relative;
  display: inline-block;
}

/* ── Trigger pill ─────────────────────────────────────────── */
.trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 10px 0 12px;
  background: #fff;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  cursor: pointer;
  transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
}
.trigger:hover {
  border-color: var(--eg-brand);
}
.trigger.active {
  border-color: var(--eg-brand);
  background: var(--eg-brand-light);
}
.cal-icon {
  font-size: 20px;
  color: #a7aca2;
}
.trigger.active .cal-icon {
  color: var(--eg-brand-dark);
}
.trigger-text {
  font: 700 13px var(--eg-font);
  color: var(--eg-muted);
  white-space: nowrap;
}
.trigger.active .trigger-text {
  color: var(--eg-brand-dark);
}
.chev {
  font-size: 18px;
  color: #a7aca2;
}
.clear {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: var(--eg-brand-dark);
}
.clear:hover {
  background: rgba(62, 124, 18, 0.12);
}
.clear .material-symbols-outlined {
  font-size: 16px;
}

/* ── Popover (teleported to <body>, positioned via inline fixed coords) ── */
.popover {
  position: fixed;
  z-index: 1000; /* above the sidebar (60) and drawers */
  width: 288px;
  padding: 14px;
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  box-shadow: 0 16px 40px -12px rgba(22, 24, 28, 0.22);
}
.pop-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.pop-title {
  font: 800 15px var(--eg-font);
  color: var(--eg-ink);
}
.nav {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--eg-border);
  border-radius: 9px;
  background: #fff;
  cursor: pointer;
  color: var(--eg-ink);
}
.nav:hover {
  border-color: var(--eg-brand);
  color: var(--eg-brand-dark);
}
.nav .material-symbols-outlined {
  font-size: 20px;
}
.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}
.wd {
  text-align: center;
  font: 700 11px var(--eg-font);
  color: var(--eg-hint);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cell {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 13px var(--eg-font);
}
.cell.empty {
  pointer-events: none;
}
.cell.day {
  border: none;
  background: transparent;
  border-radius: 9px;
  color: var(--eg-ink);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.cell.day:hover {
  background: var(--eg-brand-light);
  color: var(--eg-brand-dark);
}
.cell.day.today {
  color: var(--eg-brand-dark);
  font-weight: 800;
  box-shadow: inset 0 0 0 1px var(--eg-brand);
}
.cell.day.selected {
  background: var(--eg-brand);
  color: #fff;
  font-weight: 800;
  box-shadow: none;
}
.cell.day.disabled {
  color: #c7ccc2;
  cursor: default;
  pointer-events: none;
}
.cell.day.disabled.today {
  box-shadow: none;
}
.pop-foot {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f1ee;
}
.foot-btn {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: var(--eg-brand);
  color: #fff;
  font: 700 13px var(--eg-font);
  cursor: pointer;
}
.foot-btn.ghost {
  background: #fff;
  border: 1px solid var(--eg-border);
  color: var(--eg-ink);
}
.foot-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ── Popover transition ───────────────────────────────────── */
.dp-pop-enter-active,
.dp-pop-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.dp-pop-enter-from,
.dp-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
