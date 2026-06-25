<script setup lang="ts">
defineProps<{
  active?: boolean;
  label: string;
  count?: number;
}>();
const emit = defineEmits<{ (e: 'click'): void }>();
</script>

<template>
  <button type="button" class="chip" :class="{ active }" @click="emit('click')">
    {{ label }}<template v-if="count !== undefined"> · {{ count }}</template>
  </button>
</template>

<style scoped>
.chip {
  height: 38px;
  padding: 0 16px;
  border-radius: 11px;
  border: 1px solid var(--eg-border);
  background: #fff;
  color: var(--eg-muted);
  font: 700 13px var(--eg-font);
  cursor: pointer;
}
.chip.active {
  border-color: var(--eg-brand);
  background: var(--eg-brand-light);
  color: var(--eg-brand-dark);
}
</style>
