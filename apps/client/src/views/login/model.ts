import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@easygo/api-client';
import { useAuthStore } from '@/stores/auth';

/** Phone + OTP login (clients) and phone+password login (drivers). */
export function useLoginModel() {
  const router = useRouter();
  const auth = useAuthStore();

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

  // ── Client password login ──

  async function clientLogin(): Promise<void> {
    if (!phoneValid.value || !passwordValid.value || busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      await auth.clientLogin(phone.value, password.value);
      router.replace('/tabs/home');
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
      router.replace('/tabs/home');
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Неверный код';
    } finally {
      busy.value = false;
    }
  }

  // ── Driver (password) flow ──

  async function driverLogin(): Promise<void> {
    if (!phoneValid.value || !passwordValid.value || busy.value) return;
    busy.value = true;
    error.value = null;
    try {
      await auth.driverLogin(phone.value, password.value);
      router.replace('/tabs/home');
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
    clientLogin,
    sendCode,
    confirm,
    driverLogin,
  };
}
