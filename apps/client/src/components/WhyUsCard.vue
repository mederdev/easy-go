<script setup lang="ts">
defineProps<{
  icon: string;
  title: string;
  text: string;
}>();
</script>

<template>
  <div class="why-card">
    <span class="ms why-card__icon">{{ icon }}</span>
    <div>
      <div class="why-card__title">{{ title }}</div>
      <div class="why-card__text">{{ text }}</div>
    </div>
  </div>
</template>

<style scoped>
.why-card {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--eg-bg-subtle);
  border-radius: 14px;
  padding: 14px;
}

.why-card__icon {
  color: var(--eg-green);
  font-size: 22px;
  flex-shrink: 0;
}

.why-card__title {
  font: 700 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.why-card__text {
  font: 500 13px/1.45 'Manrope', sans-serif;
  color: var(--eg-muted);
  margin-top: 3px;
}
</style>
