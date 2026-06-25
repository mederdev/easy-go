<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@easygo/api-client';
import { useAuthStore } from '../stores/auth.js';
import ErrorBanner from '../components/ErrorBanner.vue';

const router = useRouter();
const auth = useAuthStore();

const step = ref<'phone' | 'otp'>('phone');
const phone = ref('+996 ');
const code = ref('');
const name = ref('');
const devCode = ref<string | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

// Resend cooldown timer
const resendIn = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
function startCooldown(seconds: number): void {
  resendIn.value = seconds;
  clearInterval(timer);
  timer = setInterval(() => {
    resendIn.value -= 1;
    if (resendIn.value <= 0) clearInterval(timer);
  }, 1000);
}
onBeforeUnmount(() => clearInterval(timer));

const phoneValid = computed(() => phone.value.replace(/\D/g, '').length >= 9);
const codeValid = computed(() => code.value.replace(/\D/g, '').length >= 4);

async function sendCode(): Promise<void> {
  if (!phoneValid.value || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    const res = await auth.requestOtp(phone.value);
    devCode.value = res.devCode ?? null;
    if (res.devCode) code.value = res.devCode; // dev convenience: auto-fill
    step.value = 'otp';
    startCooldown(30);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Не удалось отправить код';
  } finally {
    busy.value = false;
  }
}

async function confirm(): Promise<void> {
  if (!codeValid.value || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    await auth.verify(phone.value, code.value, name.value.trim() || undefined);
    router.replace('/tabs/cabinet');
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Неверный код';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="wrap">
        <button class="back" @click="step === 'otp' ? (step = 'phone') : router.back()">
          <span class="ms">arrow_back</span>
        </button>

        <!-- STEP: PHONE -->
        <template v-if="step === 'phone'">
          <div class="icon-badge"><span class="ms">smartphone</span></div>
          <h1 class="title">Вход в EasyGo</h1>
          <p class="subtitle">Введите номер телефона — пришлём одноразовый код для входа.</p>

          <div class="field">
            <div class="field-label">Номер телефона</div>
            <input v-model="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="+996 700 000 000" />
          </div>
          <div class="field">
            <div class="field-label">Имя <span class="opt">(для первого входа)</span></div>
            <input v-model="name" class="input" type="text" autocomplete="name" placeholder="Ваше имя" />
          </div>

          <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />

          <button class="primary" :disabled="!phoneValid || busy" @click="sendCode">
            {{ busy ? 'Отправка…' : 'Получить код' }}
            <span class="ms">arrow_forward</span>
          </button>
          <p class="legal">Нажимая «Получить код», вы соглашаетесь с условиями сервиса и политикой конфиденциальности.</p>
        </template>

        <!-- STEP: OTP -->
        <template v-else>
          <div class="icon-badge"><span class="ms">password</span></div>
          <h1 class="title">Введите код</h1>
          <p class="subtitle">Код отправлен на <b>{{ phone }}</b>.</p>

          <input
            v-model="code"
            class="code-input"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="——————"
            @keyup.enter="confirm"
          />
          <div v-if="devCode" class="dev-hint">Код для разработки: <b>{{ devCode }}</b></div>

          <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />

          <button class="primary" :disabled="!codeValid || busy" @click="confirm">
            {{ busy ? 'Проверка…' : 'Подтвердить' }}
          </button>

          <button class="resend" :disabled="resendIn > 0 || busy" @click="sendCode">
            <span class="ms" style="font-size: 18px">schedule</span>
            {{ resendIn > 0 ? `Отправить повторно через 0:${String(resendIn).padStart(2, '0')}` : 'Отправить код повторно' }}
          </button>
        </template>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.wrap { padding: 8px 18px 24px; }
.back {
  width: 38px; height: 38px; border-radius: 11px; border: 1px solid #e7e9e5;
  background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 21px;
}
.icon-badge {
  width: 62px; height: 62px; border-radius: 18px; background: var(--eg-green-light);
  display: flex; align-items: center; justify-content: center; margin: 26px 0 16px;
}
.icon-badge .ms { font-size: 32px; color: var(--eg-green); }
.title { margin: 0; font: 800 26px/1.15 'Manrope', sans-serif; letter-spacing: -0.02em; }
.subtitle { margin: 8px 0 0; font: 500 14px/1.5 'Manrope', sans-serif; color: var(--eg-muted); }
.field { margin-top: 18px; }
.field-label { font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted-light); margin-bottom: 6px; }
.opt { color: #c4c8c0; }
.input {
  width: 100%; height: 56px; padding: 0 14px; border: 1px solid #e2e5df; border-radius: 14px;
  font: 600 16px 'Manrope', sans-serif; color: var(--eg-ink); outline: none; background: #fff;
}
.input:focus { border-color: var(--eg-green); }
.code-input {
  width: 100%; height: 64px; margin-top: 26px; text-align: center;
  font: 800 28px 'Manrope', sans-serif; letter-spacing: 12px; color: var(--eg-ink);
  border: 2px solid var(--eg-green); border-radius: 16px; outline: none; background: #fff;
}
.dev-hint {
  margin-top: 10px; padding: 8px 12px; border-radius: 10px; background: var(--eg-green-light);
  color: var(--eg-green-accent); font: 600 13px 'Manrope', sans-serif; text-align: center;
}
.primary {
  width: 100%; margin-top: 18px; height: 54px; border: none; border-radius: 15px;
  background: var(--eg-green); color: #fff; font: 700 16px 'Manrope', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.resend {
  width: 100%; margin-top: 16px; background: none; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font: 600 13px 'Manrope', sans-serif; color: var(--eg-muted-light);
}
.resend:disabled { cursor: default; }
.legal { margin: 16px 2px 0; font: 500 12px/1.5 'Manrope', sans-serif; color: var(--eg-muted-light); }
</style>
