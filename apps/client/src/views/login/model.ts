import { ref, computed, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/** Phone + OTP login (clients) and phone+password login (drivers). */
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
  // client sub-mode: password by default, otp as fallback for forgotten password
  const clientMode = ref<'password' | 'otp'>('password');
  const step = ref<'phone' | 'otp'>('phone');
  const phone = ref('+996 ');
  const code = ref('');
  const name = ref('');
  const password = ref('');
  const devCode = ref<string | null>(null);
  const busy = ref(false);
  const error = ref<string | null>(null);

  // Resend cooldown timer (client OTP only)
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
  const passwordValid = computed(() => password.value.length >= 6);

  function switchMode(m: 'client' | 'driver'): void {
    mode.value = m;
    clientMode.value = 'password';
    step.value = 'phone';
    error.value = null;
    code.value = '';
    password.value = '';
    devCode.value = null;
  }

  function switchToOtp(): void {
    clientMode.value = 'otp';
    step.value = 'phone';
    error.value = null;
    code.value = '';
    password.value = '';
    devCode.value = null;
  }

  function switchToPassword(): void {
    clientMode.value = 'password';
    step.value = 'phone';
    error.value = null;
    code.value = '';
    devCode.value = null;
  }

  /**
   * Top-left back arrow. Within the OTP flow it steps back one screen; at the
   * entry screen it returns to the page we came from (e.g. the booking flow) —
   * but only if that's an in-app page. Vue Router records the previous path in
   * `history.state.back`; when it's absent (login was the first page, or the
   * user arrived from an unrelated origin like the admin panel) we fall back to
   * home instead of router.back(), which would otherwise escape the app.
   */
  function goBack(): void {
    if (step.value === 'otp') {
      step.value = 'phone';
      return;
    }
    if (clientMode.value === 'otp') {
      switchToPassword();
      return;
    }
    const prev = window.history.state?.back;
    if (typeof prev === 'string' && prev.startsWith('/') && !prev.startsWith('//')) {
      router.back();
    } else {
      router.replace('/tabs/home');
    }
  }

  // ── Client password login ──

  async function clientLogin(): Promise<void> {
    if (!phoneValid.value || !passwordValid.value || busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      await auth.clientLogin(phone.value, password.value);
      finishLogin();
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Неверный телефон или пароль';
    } finally {
      busy.value = false;
    }
  }

  // ── Client OTP flow ──

  async function sendCode(): Promise<void> {
    if (!phoneValid.value || busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      const res = await auth.requestOtp(phone.value);
      devCode.value = res.devCode ?? null;
      if (res.devCode) code.value = res.devCode;
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
      finishLogin();
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Неверный код';
    } finally {
      busy.value = false;
    }
  }

  // ── Telegram deep-link login ──
  // Start → open t.me/<bot>?start=<nonce> → poll until the bot confirms.

  const tgWaiting = ref(false);
  const tgDeepLink = ref<string | null>(null);
  const tgNonce = ref<string | null>(null);
  let tgPollTimer: ReturnType<typeof setInterval> | undefined;

  async function telegramLogin(): Promise<void> {
    if (busy.value) return;
    error.value = null;
    try {
      const res = await api.clientAuth.telegramStart();
      tgNonce.value = res.nonce;
      tgDeepLink.value = res.deepLink;
      tgWaiting.value = true;
      if (res.deepLink) window.open(res.deepLink, '_blank');
      clearInterval(tgPollTimer);
      tgPollTimer = setInterval(pollTelegram, 2000);
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Не удалось войти через Telegram';
    }
  }

  async function pollTelegram(): Promise<void> {
    if (!tgNonce.value) return;
    try {
      const res = await api.clientAuth.telegramPoll(tgNonce.value);
      if (res.status === 'pending') return;
      cancelTelegram();
      if (res.status === 'confirmed') {
        auth.setClientSession(res.token, res.client);
        finishLogin();
      } else if (res.status === 'error') {
        error.value = res.message;
      } else {
        error.value = 'Время ожидания истекло, попробуйте ещё раз';
      }
    } catch {
      // Network hiccup — keep polling until the nonce expires.
    }
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
    tgWaiting.value = false;
    tgNonce.value = null;
  }

  onBeforeUnmount(() => clearInterval(tgPollTimer));

  // ── Driver (password) flow ──

  async function driverLogin(): Promise<void> {
    if (!phoneValid.value || !passwordValid.value || busy.value) return;
    busy.value = true;
    error.value = null;
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
    goBack,
    clientLogin,
    sendCode,
    confirm,
    telegramLogin,
    telegramDevConfirm,
    cancelTelegram,
    tgWaiting,
    tgDeepLink,
    driverLogin,
    showTelegram,
    isDev,
  };
}
