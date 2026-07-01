<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import TelegramLoginButton from '@/components/TelegramLoginButton.vue';
import { useLoginModel } from './model';

const {
  router,
  mode,
  clientMode,
  step,
  phone,
  code,
  name,
  password,
  devCode,
  busy,
  error,
  resendIn,
  phoneValid,
  codeValid,
  passwordValid,
  switchMode,
  switchToOtp,
  switchToPassword,
  clientLogin,
  sendCode,
  confirm,
  telegramLogin,
  driverLogin,
  showTelegram,
} = useLoginModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg pg--narrow">
      <div class="wrap">
        <button class="back" @click="step === 'otp' ? (step = 'phone') : clientMode === 'otp' ? switchToPassword() : router.back()">
          <span class="ms">arrow_back</span>
        </button>

        <!-- Mode toggle -->
        <div class="mode-tabs">
          <button :class="['seg', mode === 'client' && 'seg--on']" @click="switchMode('client')">Пассажир</button>
          <button :class="['seg', mode === 'driver' && 'seg--on']" @click="switchMode('driver')">Водитель</button>
        </div>

        <!-- ── CLIENT MODE ── -->
        <template v-if="mode === 'client'">

          <!-- CLIENT: PASSWORD LOGIN (default) -->
          <template v-if="clientMode === 'password'">
            <div class="icon-badge"><span class="ms">lock</span></div>
            <h1 class="title">Вход в EasyGo</h1>
            <p class="subtitle">Введите номер телефона и пароль для входа.</p>

            <div class="field">
              <div class="field-label">Номер телефона</div>
              <input v-model="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="+996 700 000 000" />
            </div>
            <div class="field">
              <div class="field-label">Пароль</div>
              <input v-model="password" class="input" type="password" autocomplete="current-password" placeholder="Пароль" @keyup.enter="clientLogin" />
            </div>

            <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />

            <button class="primary" :disabled="!phoneValid || !passwordValid || busy" @click="clientLogin">
              {{ busy ? 'Вход…' : 'Войти' }}
              <span class="ms">arrow_forward</span>
            </button>

            <div class="forgot-row">
              <span class="forgot-text">Забыли пароль?</span>
              <button class="otp-link" @click="switchToOtp">Войти по номеру</button>
            </div>
          </template>

          <!-- CLIENT: OTP FLOW -->
          <template v-else>
            <!-- STEP: PHONE -->
            <template v-if="step === 'phone'">
              <div class="icon-badge"><span class="ms">smartphone</span></div>
              <h1 class="title">Войти по номеру</h1>
              <p class="subtitle">Введите номер телефона — пришлём одноразовый код по SMS.</p>

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
              <p class="subtitle">Код отправлен по SMS на <b>{{ phone }}</b>.</p>

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
          </template>

          <!-- Telegram login (shown on entry screens, not while entering the code) -->
          <template v-if="showTelegram && !(clientMode === 'otp' && step === 'otp')">
            <div class="or-divider"><span>или войти через</span></div>
            <TelegramLoginButton @auth="telegramLogin" />
          </template>
        </template>

        <!-- ── DRIVER MODE ── -->
        <template v-else>
          <div class="icon-badge driver-badge"><span class="ms">directions_car</span></div>
          <h1 class="title">Вход для водителя</h1>
          <p class="subtitle">Войдите по номеру телефона и паролю, который выдал администратор.</p>

          <div class="field">
            <div class="field-label">Номер телефона</div>
            <input v-model="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="+996 700 000 000" />
          </div>
          <div class="field">
            <div class="field-label">Пароль</div>
            <input v-model="password" class="input" type="password" autocomplete="current-password" placeholder="Пароль" @keyup.enter="driverLogin" />
          </div>

          <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />

          <button class="primary" :disabled="!phoneValid || !passwordValid || busy" @click="driverLogin">
            {{ busy ? 'Вход…' : 'Войти' }}
            <span class="ms">arrow_forward</span>
          </button>
        </template>
      </div>
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
.mode-tabs {
  display: flex; gap: 6px; margin: 20px 0 4px; background: #f0f2ed; border-radius: 13px; padding: 4px;
}
.seg {
  flex: 1; height: 38px; border: none; border-radius: 10px; font: 700 13px 'Manrope', sans-serif;
  cursor: pointer; background: transparent; color: var(--eg-muted);
}
.seg--on { background: #fff; color: var(--eg-ink); box-shadow: 0 1px 4px rgba(0,0,0,.1); }
.icon-badge {
  width: 62px; height: 62px; border-radius: 18px; background: var(--eg-green-light);
  display: flex; align-items: center; justify-content: center; margin: 26px 0 16px;
}
.driver-badge { background: #EEF0FF; }
.driver-badge .ms { color: #5060C8; }
.icon-badge .ms { font-size: 32px; color: var(--eg-green); }
.title { margin: 0; font: 800 26px/1.15 'Manrope', sans-serif; letter-spacing: -0.02em; }
.subtitle { margin: 8px 0 0; font: 500 14px/1.5 'Manrope', sans-serif; color: var(--eg-muted); }
.field { margin-top: 18px; }
.field-label { font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted-light); margin-bottom: 6px; }
.opt { color: #c4c8c0; }
.input {
  width: 100%; height: 56px; padding: 0 14px; border: 1px solid #e2e5df; border-radius: 14px;
  font: 600 16px 'Manrope', sans-serif; color: var(--eg-ink); outline: none; background: #fff;
  box-sizing: border-box;
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
.forgot-row {
  margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 6px;
}
.forgot-text { font: 500 13px 'Manrope', sans-serif; color: var(--eg-muted-light); }
.otp-link {
  background: none; border: none; cursor: pointer; padding: 0;
  font: 600 13px 'Manrope', sans-serif; color: var(--eg-green); text-decoration: underline;
  text-underline-offset: 2px;
}
.or-divider {
  display: flex; align-items: center; gap: 10px; margin: 22px 0 2px;
  color: var(--eg-muted-light); font: 600 12px 'Manrope', sans-serif;
}
.or-divider::before, .or-divider::after {
  content: ''; flex: 1; height: 1px; background: #e2e5df;
}
</style>
