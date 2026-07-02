<script setup lang="ts">
import { useLoginModel } from './model';

const {
  mode,
  setMode,
  phone,
  password,
  loading,
  error,
  submit,
  otpSent,
  code,
  cooldown,
  requestOtp,
  verifyOtp,
  tgWaiting,
  tgDeepLink,
  telegramLogin,
  telegramDevConfirm,
  cancelTelegram,
  isDev,
} = useLoginModel();
</script>

<template>
  <div class="page">
    <div class="card">
      <div class="brand">EASY<span>GO</span></div>
      <div class="title">Панель управления</div>
      <div class="subtitle">Войдите, чтобы управлять трансферами</div>

      <!-- Telegram deep-link: waiting panel replaces the form while polling -->
      <div v-if="tgWaiting" class="tg-wait">
        <div class="tg-wait-title">Подтвердите вход в Telegram</div>
        <div class="tg-wait-text">
          Откройте Telegram и нажмите «Start» в чате с ботом. Ожидаем подтверждения…
        </div>
        <a v-if="tgDeepLink" class="tg-wait-link" :href="tgDeepLink" target="_blank" rel="noopener">
          Открыть Telegram ещё раз
        </a>
        <button v-if="isDev" type="button" class="tg-dev" @click="telegramDevConfirm">
          Подтвердить (dev)
        </button>
        <div v-if="error" class="error">{{ error }}</div>
        <button type="button" class="ghost" @click="cancelTelegram">Отмена</button>
      </div>

      <template v-else>
        <div class="tabs">
          <button type="button" :class="['tab', { active: mode === 'password' }]" @click="setMode('password')">
            Пароль
          </button>
          <button type="button" :class="['tab', { active: mode === 'otp' }]" @click="setMode('otp')">
            Код входа
          </button>
        </div>

        <form v-if="mode === 'password'" class="form" @submit.prevent="submit">
          <label class="field">
            <span class="label">Телефон</span>
            <input
              v-model="phone"
              type="tel"
              inputmode="tel"
              placeholder="+996 700 00 00 01"
              autocomplete="username"
            />
          </label>
          <label class="field">
            <span class="label">Пароль</span>
            <input
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </label>

          <div v-if="error" class="error">{{ error }}</div>

          <button class="submit" type="submit" :disabled="loading">
            <span v-if="loading" class="spinner" />
            <span v-else>Войти</span>
          </button>
        </form>

        <form v-else class="form" @submit.prevent="otpSent ? verifyOtp() : requestOtp()">
          <label class="field">
            <span class="label">Телефон</span>
            <input
              v-model="phone"
              type="tel"
              inputmode="tel"
              placeholder="+996 700 00 00 01"
              autocomplete="username"
            />
          </label>
          <div class="hint-inline">Мы отправим код в Telegram на этот номер</div>

          <label v-if="otpSent" class="field">
            <span class="label">Код из Telegram</span>
            <input v-model="code" inputmode="numeric" placeholder="000000" autocomplete="one-time-code" />
          </label>

          <div v-if="error" class="error">{{ error }}</div>

          <button class="submit" type="submit" :disabled="loading">
            <span v-if="loading" class="spinner" />
            <span v-else>{{ otpSent ? 'Войти' : 'Получить код' }}</span>
          </button>

          <button
            v-if="otpSent"
            type="button"
            class="ghost"
            :disabled="cooldown > 0"
            @click="requestOtp"
          >
            {{ cooldown > 0 ? `Отправить снова через ${cooldown} с` : 'Отправить код ещё раз' }}
          </button>
        </form>

        <div class="divider"><span>или</span></div>

        <button type="button" class="tg-btn" @click="telegramLogin">
          <svg class="tg-icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M11.944 0C5.347 0 0 5.347 0 11.944c0 6.598 5.347 11.945 11.944 11.945 6.598 0 11.945-5.347 11.945-11.945C23.889 5.347 18.542 0 11.944 0Zm5.79 8.13-1.953 9.216c-.147.654-.537.813-1.088.506l-3.006-2.216-1.45 1.397c-.16.16-.295.295-.605.295l.216-3.064 5.576-5.038c.242-.216-.053-.336-.376-.12l-6.893 4.34-2.968-.927c-.645-.201-.657-.645.134-.955l11.598-4.47c.537-.2 1.007.12.815 1.036Z"
            />
          </svg>
          Войти через Telegram
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e7e9e3;
  padding: 24px;
}
.card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 20px;
  padding: 32px 30px;
  box-shadow: 0 24px 60px -28px rgba(20, 30, 10, 0.35);
}
.brand {
  font: 800 26px var(--eg-font);
  letter-spacing: -0.02em;
}
.brand span {
  color: var(--eg-brand);
}
.title {
  font: 800 20px var(--eg-font);
  margin-top: 14px;
}
.subtitle {
  font: 500 13px var(--eg-font);
  color: var(--eg-hint);
  margin-top: 2px;
}
.tabs {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  background: #f1f3ee;
  border-radius: 12px;
  padding: 4px;
}
.tab {
  height: 38px;
  border: none;
  border-radius: 9px;
  background: transparent;
  font: 700 13px var(--eg-font);
  color: var(--eg-hint);
  cursor: pointer;
}
.tab.active {
  background: #fff;
  color: var(--eg-ink, #16181c);
  box-shadow: 0 2px 8px -4px rgba(20, 30, 10, 0.25);
}
.form {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
}
input {
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--eg-border);
  border-radius: 12px;
  font: 600 14px var(--eg-font);
  outline: none;
}
input:focus {
  border-color: var(--eg-brand);
}
.hint-inline {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
  margin-top: -8px;
}
.error {
  background: #fbedea;
  color: #c0492e;
  font: 600 13px var(--eg-font);
  padding: 10px 14px;
  border-radius: 11px;
}
.submit {
  height: 50px;
  border: none;
  border-radius: 12px;
  background: var(--eg-brand);
  color: #fff;
  font: 700 15px var(--eg-font);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.submit:disabled {
  opacity: 0.7;
  cursor: default;
}
.ghost {
  height: 44px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--eg-hint);
  font: 600 13px var(--eg-font);
  cursor: pointer;
}
.ghost:disabled {
  opacity: 0.6;
  cursor: default;
}
.divider {
  margin: 16px 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--eg-hint);
  font: 600 12px var(--eg-font);
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--eg-line);
}
.tg-btn {
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 12px;
  background: #29a3e2;
  color: #fff;
  font: 700 15px var(--eg-font);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}
.tg-icon {
  width: 20px;
  height: 20px;
}
.tg-wait {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tg-wait-title {
  font: 800 16px var(--eg-font);
}
.tg-wait-text {
  font: 500 13px var(--eg-font);
  color: var(--eg-hint);
}
.tg-wait-link {
  font: 700 13px var(--eg-font);
  color: #29a3e2;
  text-decoration: none;
}
.tg-dev {
  height: 44px;
  border: 1px dashed var(--eg-border);
  border-radius: 12px;
  background: #fbfcfa;
  font: 700 13px var(--eg-font);
  color: var(--eg-hint);
  cursor: pointer;
}
.spinner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
