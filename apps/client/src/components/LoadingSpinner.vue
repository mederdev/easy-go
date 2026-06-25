<script setup lang="ts">
defineProps<{
  label?: string;
}>();
</script>

<template>
  <div class="loading-spinner">
    <div class="loading-spinner__ring"></div>
    <span v-if="label" class="loading-spinner__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
}

.loading-spinner__ring {
  width: 36px;
  height: 36px;
  border: 3px solid #EEF0EC;
  border-top-color: var(--eg-green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-spinner__label {
  font: 600 13px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
}
</style>
