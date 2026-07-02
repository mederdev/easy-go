<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
  }>(),
  { icon: 'inbox', description: '' },
);
</script>

<template>
  <div class="empty">
    <span class="material-symbols-outlined">{{ icon }}</span>
    <div class="title">{{ title }}</div>
    <div v-if="description" class="desc">{{ description }}</div>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 48px 20px;
  text-align: center;
}
.material-symbols-outlined {
  font-size: 44px;
  color: #c4c8c0;
  margin-bottom: 4px;
}
.title {
  font: 800 16px var(--eg-font);
  color: var(--eg-ink);
}
.desc {
  font: 500 13px var(--eg-font);
  color: var(--eg-hint);
  max-width: 360px;
}
</style>
