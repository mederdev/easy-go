<script setup lang="ts">
const props = defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
  compact?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: number];
}>();

function dec() {
  const min = props.min ?? 1;
  if (props.modelValue > min) {
    emit('update:modelValue', props.modelValue - 1);
  }
}

function inc() {
  const max = props.max ?? 20;
  if (props.modelValue < max) {
    emit('update:modelValue', props.modelValue + 1);
  }
}
</script>

<template>
  <div :class="['pax-stepper', compact && 'pax-stepper--compact']">
    <button class="pax-stepper__btn pax-stepper__btn--minus" @click="dec" :disabled="modelValue <= (min ?? 1)">
      <span class="ms">remove</span>
    </button>
    <div class="pax-stepper__count">
      <span class="pax-stepper__num">{{ modelValue }}</span>
      <span v-if="!compact" class="pax-stepper__label">пасс.</span>
    </div>
    <button class="pax-stepper__btn pax-stepper__btn--plus" @click="inc" :disabled="modelValue >= (max ?? 20)">
      <span class="ms">add</span>
    </button>
  </div>
</template>

<style scoped>
.pax-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--eg-bg-subtle);
  border-radius: 14px;
  padding: 8px 10px;
}

.pax-stepper--compact {
  gap: 4px;
  padding: 6px 8px;
}

.pax-stepper__btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: opacity 0.15s;
}

.pax-stepper__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pax-stepper__btn--minus {
  background: #fff;
  color: var(--eg-ink);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.pax-stepper__btn--plus {
  background: var(--eg-green);
  color: #fff;
}

.pax-stepper__count {
  text-align: center;
  min-width: 30px;
}

.pax-stepper__num {
  display: block;
  font: 800 17px 'Manrope', sans-serif;
  line-height: 1;
  color: var(--eg-ink);
}

.pax-stepper__label {
  display: block;
  font: 600 9px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  text-transform: uppercase;
  margin-top: 2px;
}
</style>
