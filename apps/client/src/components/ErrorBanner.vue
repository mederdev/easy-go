<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <div class="error-banner">
    <span class="ms error-banner__icon">error_outline</span>
    <span class="error-banner__text">{{ message }}</span>
  </div>
</template>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 16px;
  padding: 14px 16px;
  background: #FBEDEA;
  border: 1px solid #F5C6BC;
  border-radius: 14px;
}

.error-banner__icon {
  color: #C0492E;
  font-size: 20px;
  flex-shrink: 0;
}

.error-banner__text {
  font: 600 13px/1.4 'Manrope', sans-serif;
  color: #C0492E;
}
</style>
