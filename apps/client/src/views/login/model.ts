import { ref, computed, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@easygo/api-client';
import type { ClientTelegramPollResponse } from '@easygo/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/**
 * Client auth: phone+password login, registration (phone+name → Telegram or
 * password), forgot-password (Telegram → new password, else "ask the admin"),
 * plus the phone+password driver login.
 */
export type ClientScreen = 'login' | 'register-info' | 'register-method' | 'forgot' | 'reset-password';

export function useLoginModel() {
  const router = useRouter();
  const route = useRoute();
  const auth = useAuthStore();

  /**
   * After a successful login, return to the action the guest was trying to do
   * (the `redirect` query set by the auth guard / gated CTAs), else go home.
   * Only same-origin paths are honoured — guards against open redirects.
   */
  function finishLogin(): void {
    const r = route.query.redirect;
    const target = typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') ? r : '/tabs/home';
    router.replace(target);
  }

  // The API builds the t.me deep link from its own bot username, so the client
  // no longer needs the build-time VITE_TELEGRAM_BOT_USERNAME — always offer
  // Telegram login/registration, matching the admin app.
  const showTelegram = true;
  const isDev = import.meta.env.DEV;

  const mode = ref<'client' | 'driver'>('client');
  const screen = ref<ClientScreen>('login');
  const phone = ref('+996 ');
  const name = ref('');
  const password = ref('');
  const password2 = ref('');
  const busy = ref(false);
  const error = ref<string | null>(null);
  const errorCode = ref<string | null>(null);
  /** Neutral banner (e.g. «Аккаунт не найден…» after a Telegram login attempt). */
  const notice = ref<string | null>(null);

  const phoneValid = computed(() => phone.value.replace(/\D/g, '').length >= 9);
  const nameValid = computed(() => name.value.trim().length >= 1);
  const passwordValid = computed(() => password.value.length >= 6);
  const passwordsMismatch = computed(() => password2.value.length > 0 && password2.value !== password.value);
  const passwordPairValid = computed(() => passwordValid.value && password2.value === password.value);

  function resetFeedback(): void {
    error.value = null;
    errorCode.value = null;
    notice.value = null;
  }

  function goTo(next: ClientScreen): void {
    cancelTelegram();
    resetFeedback();
    password.value = '';
    password2.value = '';
    screen.value = next;
  }

  function switchMode(m: 'client' | 'driver'): void {
    cancelTelegram();
    resetFeedback();
    mode.value = m;
    screen.value = 'login';
    password.value = '';
    password2.value = '';
  }

  /**
   * Top-left back arrow. Inner screens step back through the flow; at the
   * entry screen it returns to the page we came from (e.g. the booking flow) —
   * but only if that's an in-app page. Vue Router records the previous path in
   * `history.state.back`; when it's absent (login was the first page, or the
   * user arrived from an unrelated origin like the admin panel) we fall back to
   * home instead of router.back(), which would otherwise escape the app.
   */
  function goBack(): void {
    if (mode.value === 'client' && screen.value !== 'login') {
      if (screen.value === 'register-method') return goTo('register-info');
      // reset-password: the user is already authenticated — leaving is a skip.
      if (screen.value === 'reset-password') return finishLogin();
      return goTo('login');
    }
    const prev = window.history.state?.back;
    if (typeof prev === 'string' && prev.startsWith('/') && !prev.startsWith('//')) {
      router.back();
    } else {
      router.replace('/tabs/home');
    }
  }

  // ── Client: password login ──

  async function clientLogin(): Promise<void> {
    if (!phoneValid.value || !passwordValid.value || busy.value) return;
    busy.value = true;
    resetFeedback();
    try {
      await auth.clientLogin(phone.value, password.value);
      finishLogin();
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Неверный телефон или пароль';
    } finally {
      busy.value = false;
    }
  }

  // ── Client: registration ──

  function continueRegister(): void {
    if (!phoneValid.value || !nameValid.value) return;
    goTo('register-method');
  }

  async function registerWithPassword(): Promise<void> {
    if (!passwordPairValid.value || busy.value) return;
    busy.value = true;
    resetFeedback();
    try {
      await auth.register(phone.value, name.value.trim(), password.value);
      finishLogin();
    } catch (e) {
      if (e instanceof ApiError) {
        error.value = e.message;
        errorCode.value = e.code;
      } else {
        error.value = 'Не удалось зарегистрироваться';
      }
    } finally {
      busy.value = false;
    }
  }

  // ── Client: new password after a Telegram reset ──

  async function saveNewPassword(): Promise<void> {
    if (!passwordPairValid.value || busy.value) return;
    busy.value = true;
    resetFeedback();
    try {
      await api.me.setPassword({ password: password.value });
      finishLogin();
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Не удалось сохранить пароль';
    } finally {
      busy.value = false;
    }
  }

  /** «Пропустить» on the reset screen — the Telegram session is already active. */
  function skipNewPassword(): void {
    finishLogin();
  }

  // ── Telegram deep-link (shared by login / registration / forgot) ──
  // Start → open t.me/<bot>?start=<nonce> → poll until the bot confirms.

  const tgWaiting = ref(false);
  const tgDeepLink = ref<string | null>(null);
  const tgNonce = ref<string | null>(null);
  let tgPollTimer: ReturnType<typeof setInterval> | undefined;
  // Handle to the popup opened for Telegram — kept so we can close it (and
  // refocus this window) the moment the bot confirms, sparing the user a
  // manual tab switch back to the site.
  let tgPopup: Window | null = null;
  // Which screen started the flow — decides what a confirmation means.
  let tgOrigin: ClientScreen = 'login';

  const tgButtonLabel = computed(() =>
    screen.value === 'register-method' ? 'Продолжить с Telegram' : 'Войти через Telegram',
  );

  async function telegramStart(): Promise<void> {
    if (busy.value) return;
    resetFeedback();
    tgOrigin = screen.value;
    // Open the popup synchronously inside the click gesture — opening it after
    // the await below would trip popup blockers.
    tgPopup = window.open('', 'easygo_tg', 'width=520,height=700');
    try {
      const res = await api.clientAuth.telegramStart(
        tgOrigin === 'register-method' ? { phone: phone.value, name: name.value.trim() } : undefined,
      );
      tgNonce.value = res.nonce;
      tgDeepLink.value = res.deepLink;
      tgWaiting.value = true;
      if (res.deepLink && tgPopup && !tgPopup.closed) tgPopup.location.href = res.deepLink;
      else if (res.deepLink) window.open(res.deepLink, '_blank'); // popup blocked → plain tab
      else tgPopup?.close(); // dev without a bot — dev-confirm button drives it
      clearInterval(tgPollTimer);
      tgPollTimer = setInterval(pollTelegram, 2000);
    } catch (e) {
      tgPopup?.close();
      tgPopup = null;
      error.value = e instanceof ApiError ? e.message : 'Не удалось войти через Telegram';
    }
  }

  async function pollTelegram(): Promise<void> {
    if (!tgNonce.value) return;
    try {
      const res = await api.clientAuth.telegramPoll(tgNonce.value);
      if (res.status === 'pending') return;
      cancelTelegram();
      handleTgResult(res);
    } catch {
      // Network hiccup — keep polling until the nonce expires.
    }
  }

  function handleTgResult(res: Exclude<ClientTelegramPollResponse, { status: 'pending' }>): void {
    if (res.status === 'confirmed') {
      auth.setClientSession(res.token, res.client);
      if (tgOrigin === 'forgot') {
        password.value = '';
        password2.value = '';
        screen.value = 'reset-password';
      } else {
        finishLogin();
      }
      return;
    }
    if (res.status === 'not_registered') {
      if (tgOrigin === 'forgot') {
        error.value = 'Аккаунт с таким Telegram не найден. Зарегистрируйтесь или обратитесь к администратору.';
      } else {
        screen.value = 'register-info';
        notice.value = 'Аккаунт не найден — зарегистрируйтесь, это займёт меньше минуты.';
      }
      return;
    }
    error.value = res.status === 'error' ? res.message : 'Время ожидания истекло, попробуйте ещё раз';
  }

  /** Dev-only: confirm the nonce without a real bot (backend dev endpoint). */
  async function telegramDevConfirm(): Promise<void> {
    if (!tgNonce.value) return;
    try {
      await api.auth.telegramDevConfirm(tgNonce.value);
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Не удалось подтвердить (dev)';
    }
  }

  function cancelTelegram(): void {
    clearInterval(tgPollTimer);
    // Close the popup and bring this window forward (no-op if already closed).
    tgPopup?.close();
    tgPopup = null;
    window.focus();
    tgWaiting.value = false;
    tgNonce.value = null;
  }

  onBeforeUnmount(() => {
    clearInterval(tgPollTimer);
    tgPopup?.close();
  });

  // ── Driver (password) flow ──

  async function driverLogin(): Promise<void> {
    if (!phoneValid.value || !passwordValid.value || busy.value) return;
    busy.value = true;
    resetFeedback();
    try {
      await auth.driverLogin(phone.value, password.value);
      finishLogin();
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Неверный телефон или пароль';
    } finally {
      busy.value = false;
    }
  }

  return {
    router,
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
  };
}
