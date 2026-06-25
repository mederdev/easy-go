<script setup lang="ts">
// Renders loading / error states; otherwise the default slot.
defineProps<{
  loading?: boolean;
  error?: string | null;
}>();
const emit = defineEmits<{ (e: 'retry'): void }>();
</script>

<template>
  <div v-if="loading" class="state">
    <span class="spinner" />
    <div class="msg">Загрузка…</div>
  </div>
  <div v-else-if="error" class="state error">
    <span class="material-symbols-outlined">error</span>
    <div class="msg">{{ error }}</div>
    <button class="retry" type="button" @click="emit('retry')">Повторить</button>
  </div>
  <slot v-else />
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 20px;
  text-align: center;
}
.msg {
  font: 600 14px var(--eg-font);
  color: var(--eg-muted);
}
.state.error .material-symbols-outlined {
  font-size: 40px;
  color: #c0492e;
}
.spinner {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid #e7e9e5;
  border-top-color: var(--eg-brand);
  animation: spin 0.8s linear infinite;
}
.retry {
  height: 38px;
  padding: 0 18px;
  border: 1px solid var(--eg-border);
  background: #fff;
  border-radius: 11px;
  font: 700 13px var(--eg-font);
  color: var(--eg-ink);
  cursor: pointer;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
