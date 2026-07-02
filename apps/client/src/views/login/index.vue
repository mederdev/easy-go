<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import TelegramLoginButton from '@/components/TelegramLoginButton.vue';
import { useLoginModel } from './model';

const {
  mode,
  screen,
  phone,
  name,
  password,
  password2,
  busy,
  error,
  errorCode,
  notice,
  phoneValid,
  nameValid,
  passwordValid,
  passwordsMismatch,
  passwordPairValid,
  switchMode,
  goTo,
  goBack,
  clientLogin,
  continueRegister,
  registerWithPassword,
  saveNewPassword,
  skipNewPassword,
  telegramStart,
  telegramDevConfirm,
  cancelTelegram,
  tgWaiting,
  tgDeepLink,
  tgButtonLabel,
  driverLogin,
  showTelegram,
  isDev,
} = useLoginModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg pg--narrow">
      <div class="wrap">
        <button class="back" @click="goBack">
          <span class="ms">arrow_back</span>
        </button>

        <!-- Mode toggle -->
        <div class="mode-tabs">
          <button :class="['seg', mode === 'client' && 'seg--on']" @click="switchMode('client')">Пассажир</button>
          <button :class="['seg', mode === 'driver' && 'seg--on']" @click="switchMode('driver')">Водитель</button>
        </div>

        <!-- ── CLIENT MODE ── -->
        <template v-if="mode === 'client'">

          <!-- LOGIN -->
          <template v-if="screen === 'login'">
            <div class="icon-badge"><span class="ms">lock</span></div>
            <h1 class="title">Вход в EasyGo</h1>
            <p class="subtitle">Введите номер телефона и пароль или войдите через Telegram.</p>

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
              <span class="muted-text">Забыли пароль?</span>
              <button class="link-btn" @click="goTo('forgot')">Восстановить</button>
            </div>
            <div class="forgot-row" style="margin-top: 8px">
              <span class="muted-text">Нет аккаунта?</span>
              <button class="link-btn" @click="goTo('register-info')">Зарегистрироваться</button>
            </div>
          </template>

          <!-- REGISTER: STEP 1 — PHONE + NAME -->
          <template v-else-if="screen === 'register-info'">
            <div class="icon-badge"><span class="ms">person_add</span></div>
            <h1 class="title">Регистрация</h1>
            <p class="subtitle">Укажите номер телефона и имя — они понадобятся для бронирований.</p>

            <div v-if="notice" class="notice-banner">
              <span class="ms" style="font-size: 18px">info</span>
              {{ notice }}
            </div>

            <div class="field">
              <div class="field-label">Номер телефона</div>
              <input v-model="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="+996 700 000 000" />
            </div>
            <div class="field">
              <div class="field-label">Имя</div>
              <input v-model="name" class="input" type="text" autocomplete="name" placeholder="Ваше имя" @keyup.enter="continueRegister" />
            </div>

            <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />

            <button class="primary" :disabled="!phoneValid || !nameValid" @click="continueRegister">
              Продолжить
              <span class="ms">arrow_forward</span>
            </button>

            <div class="forgot-row">
              <span class="muted-text">Уже есть аккаунт?</span>
              <button class="link-btn" @click="goTo('login')">Войти</button>
            </div>
            <p class="legal">Нажимая «Продолжить», вы соглашаетесь с условиями сервиса и политикой конфиденциальности.</p>
          </template>

          <!-- REGISTER: STEP 2 — TELEGRAM OR PASSWORD -->
          <template v-else-if="screen === 'register-method'">
            <div class="icon-badge"><span class="ms">key</span></div>
            <h1 class="title">Почти готово</h1>
            <p class="subtitle">Привяжите Telegram или придумайте пароль для входа.</p>

            <div class="field">
              <div class="field-label">Пароль</div>
              <input v-model="password" class="input" type="password" autocomplete="new-password" placeholder="Минимум 6 символов" />
            </div>
            <div class="field">
              <div class="field-label">Повторите пароль</div>
              <input v-model="password2" class="input" type="password" autocomplete="new-password" placeholder="Ещё раз" @keyup.enter="registerWithPassword" />
            </div>
            <div v-if="passwordsMismatch" class="mismatch">Пароли не совпадают</div>

            <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />
            <div v-if="errorCode === 'PHONE_TAKEN'" class="forgot-row">
              <span class="muted-text">Уже есть аккаунт?</span>
              <button class="link-btn" @click="goTo('login')">Войти</button>
            </div>

            <button class="primary" :disabled="!passwordPairValid || busy" @click="registerWithPassword">
              {{ busy ? 'Регистрация…' : 'Зарегистрироваться' }}
              <span class="ms">arrow_forward</span>
            </button>
          </template>

          <!-- FORGOT PASSWORD -->
          <template v-else-if="screen === 'forgot'">
            <div class="icon-badge"><span class="ms">lock_reset</span></div>
            <h1 class="title">Восстановление пароля</h1>
            <p class="subtitle">Если к аккаунту привязан Telegram, войдите через него и задайте новый пароль.</p>

            <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />
          </template>

          <!-- NEW PASSWORD (after Telegram reset) -->
          <template v-else-if="screen === 'reset-password'">
            <div class="icon-badge"><span class="ms">password</span></div>
            <h1 class="title">Новый пароль</h1>
            <p class="subtitle">Вы вошли через Telegram. Задайте новый пароль для входа по номеру телефона.</p>

            <div class="field">
              <div class="field-label">Новый пароль</div>
              <input v-model="password" class="input" type="password" autocomplete="new-password" placeholder="Минимум 6 символов" />
            </div>
            <div class="field">
              <div class="field-label">Повторите пароль</div>
              <input v-model="password2" class="input" type="password" autocomplete="new-password" placeholder="Ещё раз" @keyup.enter="saveNewPassword" />
            </div>
            <div v-if="passwordsMismatch" class="mismatch">Пароли не совпадают</div>

            <ErrorBanner v-if="error" :message="error" style="margin-top: 12px" />

            <button class="primary" :disabled="!passwordPairValid || busy" @click="saveNewPassword">
              {{ busy ? 'Сохраняем…' : 'Сохранить пароль' }}
            </button>
            <button class="secondary" @click="skipNewPassword">Пропустить</button>
          </template>

          <!-- Telegram deep-link (login / registration / password reset) -->
          <template v-if="showTelegram && (screen === 'login' || screen === 'register-method' || screen === 'forgot')">
            <div v-if="screen !== 'forgot'" class="or-divider">
              <span>{{ screen === 'login' ? 'или войти через' : 'или' }}</span>
            </div>
            <div v-if="tgWaiting" class="tg-wait">
              <div class="tg-wait-text">Подтвердите вход в открывшемся окне Telegram — оно закроется автоматически.</div>
              <a v-if="tgDeepLink" class="tg-wait-link" :href="tgDeepLink" target="_blank" rel="noopener">
                Открыть Telegram ещё раз
              </a>
              <button v-if="isDev" class="tg-dev-confirm" type="button" @click="telegramDevConfirm">
                Подтвердить (dev)
              </button>
              <button class="tg-cancel" type="button" @click="cancelTelegram">Отмена</button>
            </div>
            <TelegramLoginButton v-else :busy="busy" :label="tgButtonLabel" @click="telegramStart" />
            <p v-if="screen === 'forgot'" class="admin-hint">
              Нет привязанного Telegram? Обратитесь к администратору, чтобы сбросить пароль.
            </p>
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
.input {
  width: 100%; height: 56px; padding: 0 14px; border: 1px solid #e2e5df; border-radius: 14px;
  font: 600 16px 'Manrope', sans-serif; color: var(--eg-ink); outline: none; background: #fff;
  box-sizing: border-box;
}
.input:focus { border-color: var(--eg-green); }
.mismatch { margin-top: 8px; font: 600 12px 'Manrope', sans-serif; color: #c0392b; }
.notice-banner {
  margin-top: 14px; padding: 12px 14px; border-radius: 13px; background: var(--eg-green-light);
  color: var(--eg-green-accent); font: 600 13px/1.4 'Manrope', sans-serif;
  display: flex; align-items: flex-start; gap: 8px;
}
.primary {
  width: 100%; margin-top: 18px; height: 54px; border: none; border-radius: 15px;
  background: var(--eg-green); color: #fff; font: 700 16px 'Manrope', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.secondary {
  width: 100%; margin-top: 12px; height: 48px; border: 1px solid #e2e5df; border-radius: 15px;
  background: #fff; color: var(--eg-muted); font: 700 14px 'Manrope', sans-serif; cursor: pointer;
}
.legal { margin: 16px 2px 0; font: 500 12px/1.5 'Manrope', sans-serif; color: var(--eg-muted-light); }
.forgot-row {
  margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 6px;
}
.muted-text { font: 500 13px 'Manrope', sans-serif; color: var(--eg-muted-light); }
.link-btn {
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
.tg-wait {
  margin-top: 14px; display: flex; flex-direction: column; gap: 10px; align-items: center;
  padding: 16px; border: 1px solid #e2e5df; border-radius: 15px; background: #fff;
}
.tg-wait-text { font: 500 13px/1.5 'Manrope', sans-serif; color: var(--eg-muted); text-align: center; }
.tg-wait-link { font: 700 13px 'Manrope', sans-serif; color: #229ED9; text-decoration: none; }
.tg-dev-confirm {
  width: 100%; height: 44px; border: 1px dashed #e2e5df; border-radius: 12px; background: #fbfcfa;
  font: 700 13px 'Manrope', sans-serif; color: var(--eg-muted); cursor: pointer;
}
.tg-cancel {
  background: none; border: none; cursor: pointer;
  font: 600 13px 'Manrope', sans-serif; color: var(--eg-muted-light);
}
.admin-hint { margin: 16px 2px 0; font: 500 13px/1.5 'Manrope', sans-serif; color: var(--eg-muted-light); text-align: center; }
</style>
