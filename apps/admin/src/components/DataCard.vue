<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string;
    icon?: string;
    hint?: string;
    trend?: 'up' | 'down' | 'flat';
    dark?: boolean;
  }>(),
  { icon: 'insights', trend: 'flat', dark: false },
);
</script>

<template>
  <div class="card" :class="{ dark }">
    <div class="head">
      <span class="label">{{ label }}</span>
      <span class="icon material-symbols-outlined">{{ icon }}</span>
    </div>
    <div class="value">{{ value }}</div>
    <div v-if="hint" class="hint" :class="trend">
      <template v-if="trend === 'up'">▲ </template>
      <template v-else-if="trend === 'down'">▼ </template>
      {{ hint }}
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--eg-surface);
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  padding: 18px 20px;
}
.card.dark {
  background: var(--eg-ink);
  border-color: var(--eg-ink);
  color: #fff;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.label {
  font: 600 13px var(--eg-font);
  color: var(--eg-hint);
}
.card.dark .label {
  color: #9ca29a;
}
.icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--eg-brand-light);
  color: var(--eg-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
}
.card.dark .icon {
  background: rgba(86, 169, 25, 0.2);
  color: var(--eg-brand-bright);
}
.value {
  font: 800 30px var(--eg-font);
  margin-top: 10px;
}
.hint {
  font: 700 12px var(--eg-font);
  color: var(--eg-hint);
  margin-top: 2px;
}
.hint.up {
  color: var(--eg-brand-dark);
}
.card.dark .hint.up {
  color: var(--eg-brand-bright);
}
.hint.down {
  color: #c0492e;
}
</style>
