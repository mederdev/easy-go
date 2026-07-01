<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import type { TelegramLoginInput } from '@easygo/shared';

const emit = defineEmits<{ (e: 'auth', user: TelegramLoginInput): void }>();

// Bot username configures the official widget. When empty in dev, we render a
// mock button that drives the backend dev-bypass (no real bot/domain needed).
const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
const isDev = import.meta.env.DEV;

// Telegram's iframe calls this global by name (data-onauth). Namespaced to us.
const CALLBACK = '__easygoOnTelegramAuth';
type TgCallback = (user: TelegramLoginInput) => void;

const container = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (!botUsername || !container.value) return;
  (window as unknown as Record<string, TgCallback>)[CALLBACK] = (user) => emit('auth', user);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', botUsername);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-radius', '12');
  script.setAttribute('data-lang', 'ru');
  script.setAttribute('data-request-access', 'write');
  script.setAttribute('data-onauth', `${CALLBACK}(user)`);
  container.value.appendChild(script);
});

onBeforeUnmount(() => {
  delete (window as unknown as Record<string, TgCallback>)[CALLBACK];
});

/** Dev-only mock: emits a payload the backend accepts via its dev-bypass. */
function devMock(): void {
  emit('auth', {
    id: 100000001,
    first_name: 'Тест',
    last_name: 'Телеграм',
    username: 'test_tg',
    auth_date: Math.floor(Date.now() / 1000),
    hash: 'dev',
  });
}
</script>

<template>
  <div class="tg-login">
    <div v-if="botUsername" ref="container" class="tg-widget" />
    <button v-else-if="isDev" class="tg-dev" type="button" @click="devMock">
      <span class="ms">send</span>
      Войти через Telegram (dev)
    </button>
  </div>
</template>

<style scoped>
.tg-login { display: flex; justify-content: center; margin-top: 14px; }
.tg-widget { min-height: 48px; }
.tg-dev {
  width: 100%; height: 54px; border: none; border-radius: 15px;
  background: #229ED9; color: #fff; font: 700 16px 'Manrope', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
</style>
