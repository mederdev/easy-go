import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@easygo/api-client';
import { useAuthStore } from '@/stores/auth';

/** Phone + OTP login: two-step state machine with a resend cooldown timer. */
export function useLoginModel() {
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

  return {
    router,
    step,
    phone,
    code,
    name,
    devCode,
    busy,
    error,
    resendIn,
    phoneValid,
    codeValid,
    sendCode,
    confirm,
  };
}
