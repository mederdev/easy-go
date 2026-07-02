import { onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api, errorMessage } from '@/lib/api';

type Mode = 'password' | 'otp';

/**
 * Login: password / phone+OTP tabs plus Telegram deep-link login. The Telegram
 * flow opens t.me/<bot>?start=<nonce> and polls until the bot confirms it —
 * domain-independent, so the same bot serves the client site and this CRM.
 */
export function useLoginModel() {
  const auth = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  const mode = ref<Mode>('password');
  const phone = ref('');
  const password = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Phone + OTP
  const otpSent = ref(false);
  const code = ref('');
  const cooldown = ref(0);
  let cooldownTimer: number | undefined;

  // Telegram deep-link
  const tgWaiting = ref(false);
  const tgDeepLink = ref<string | null>(null);
  const tgNonce = ref<string | null>(null);
  let tgPollTimer: number | undefined;
  // Popup handle — closed + refocused on confirm so the user isn't left on the
  // Telegram tab having to switch back manually.
  let tgPopup: Window | null = null;

  const isDev = import.meta.env.DEV;

  function setMode(m: Mode): void {
    mode.value = m;
    error.value = null;
  }

  async function redirectAfterLogin(): Promise<void> {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  }

  async function submit(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      await auth.login(phone.value.trim(), password.value);
      await redirectAfterLogin();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  function startCooldown(seconds: number): void {
    cooldown.value = seconds;
    window.clearInterval(cooldownTimer);
    cooldownTimer = window.setInterval(() => {
      cooldown.value -= 1;
      if (cooldown.value <= 0) window.clearInterval(cooldownTimer);
    }, 1000);
  }

  async function requestOtp(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      const res = await api.auth.requestOtp({ phone: phone.value.trim() });
      otpSent.value = true;
      if (res.devCode) code.value = res.devCode;
      startCooldown(30);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  async function verifyOtp(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      const res = await api.auth.verifyOtp({ phone: phone.value.trim(), code: code.value.trim() });
      auth.setSession(res);
      await redirectAfterLogin();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  async function telegramLogin(): Promise<void> {
    error.value = null;
    // Open the popup synchronously within the click gesture (blocker-safe).
    tgPopup = window.open('', 'easygo_tg', 'width=520,height=700');
    try {
      const res = await api.auth.telegramStart();
      tgNonce.value = res.nonce;
      tgDeepLink.value = res.deepLink;
      tgWaiting.value = true;
      if (res.deepLink && tgPopup && !tgPopup.closed) tgPopup.location.href = res.deepLink;
      else if (res.deepLink) window.open(res.deepLink, '_blank'); // popup blocked → plain tab
      else tgPopup?.close(); // dev without a bot
      window.clearInterval(tgPollTimer);
      tgPollTimer = window.setInterval(pollTelegram, 2000);
    } catch (e) {
      tgPopup?.close();
      tgPopup = null;
      error.value = errorMessage(e);
    }
  }

  async function pollTelegram(): Promise<void> {
    if (!tgNonce.value) return;
    try {
      const res = await api.auth.telegramPoll(tgNonce.value);
      if (res.status === 'pending') return;
      cancelTelegram();
      if (res.status === 'confirmed') {
        auth.setSession({ token: res.token, user: res.user });
        await redirectAfterLogin();
      } else if (res.status === 'error') {
        error.value = res.message;
      } else {
        error.value = 'Время ожидания истекло, попробуйте ещё раз';
      }
    } catch {
      // Network hiccup — keep polling until the nonce expires.
    }
  }

  /** Dev-only: confirm the nonce without a real bot. */
  async function telegramDevConfirm(): Promise<void> {
    if (!tgNonce.value) return;
    try {
      await api.auth.telegramDevConfirm(tgNonce.value);
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  function cancelTelegram(): void {
    window.clearInterval(tgPollTimer);
    tgPopup?.close();
    tgPopup = null;
    window.focus();
    tgWaiting.value = false;
    tgNonce.value = null;
  }

  onUnmounted(() => {
    window.clearInterval(tgPollTimer);
    window.clearInterval(cooldownTimer);
  });

  return {
    mode,
    setMode,
    phone,
    password,
    loading,
    error,
    submit,
    // OTP
    otpSent,
    code,
    cooldown,
    requestOtp,
    verifyOtp,
    // Telegram
    tgWaiting,
    tgDeepLink,
    telegramLogin,
    telegramDevConfirm,
    cancelTelegram,
    isDev,
  };
}
