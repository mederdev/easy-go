<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="section-header">
    <h2 class="section-header__title">{{ title }}</h2>
    <slot />
  </div>
</template>

<style scoped>
.section-header {
  padding: 24px 18px 6px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-header__title {
  margin: 0;
  font: 800 18px/1.2 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}
</style>
