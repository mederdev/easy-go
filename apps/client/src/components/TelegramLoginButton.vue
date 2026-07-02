<script setup lang="ts">
// Plain deep-link button (replaces the Login Widget): the parent starts the
// t.me/<bot>?start=<nonce> flow and polls for confirmation. Works on any
// domain and inside the Capacitor shell, where the widget iframe does not.
withDefaults(defineProps<{ busy?: boolean; label?: string }>(), { label: 'Войти через Telegram' });
const emit = defineEmits<{ (e: 'click'): void }>();
</script>

<template>
  <div class="tg-login">
    <button class="tg-btn" type="button" :disabled="busy" @click="emit('click')">
      <span class="ms">send</span>
      {{ label }}
    </button>
  </div>
</template>

<style scoped>
.tg-login { display: flex; justify-content: center; margin-top: 14px; }
.tg-btn {
  width: 100%; height: 54px; border: none; border-radius: 15px;
  background: #229ED9; color: #fff; font: 700 16px 'Manrope', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.tg-btn:disabled { opacity: 0.6; cursor: default; }
</style>
