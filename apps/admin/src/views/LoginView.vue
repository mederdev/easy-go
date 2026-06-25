<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { errorMessage } from '@/lib/api';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const phone = ref('+996700000001');
const password = ref('easygo123');
const loading = ref(false);
const error = ref<string | null>(null);

async function submit(): Promise<void> {
  error.value = null;
  loading.value = true;
  try {
    await auth.login(phone.value.trim(), password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="page">
    <div class="card">
      <div class="brand">EASY<span>GO</span></div>
      <div class="title">Панель управления</div>
      <div class="subtitle">Войдите, чтобы управлять трансферами</div>

      <form class="form" @submit.prevent="submit">
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

      <div class="hint">Демо-доступ: +996700000001 · easygo123</div>
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
.form {
  margin-top: 22px;
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
.spinner {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}
.hint {
  margin-top: 18px;
  text-align: center;
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
