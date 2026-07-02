import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import type { CurrencyCode, UpdateSystemConfigInput } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { useAuthStore } from '@/stores/auth';

/** System settings: company + regional config form, Telegram notifications & linking. */
export function useSettingsModel() {
  const config = useConfigStore();
  const auth = useAuthStore();

  const loading = ref(true);
  const error = ref<string | null>(null);
  const saving = ref(false);
  const saveError = ref<string | null>(null);
  const saved = ref(false);

  const currencies: Array<{ value: CurrencyCode; label: string }> = [
    { value: 'KGS', label: 'KGS · сом' },
    { value: 'KZT', label: 'KZT · тенге' },
    { value: 'USD', label: 'USD · доллар' },
    { value: 'RUB', label: 'RUB · рубль' },
  ];

  const locales: Array<{ value: string; label: string }> = [
    { value: 'ru-RU', label: 'Русский (ru-RU)' },
    { value: 'kk-KZ', label: 'Қазақша (kk-KZ)' },
    { value: 'en-US', label: 'English (en-US)' },
  ];

  const form = reactive({
    companyName: '',
    whatsappPhone: '',
    currency: 'KGS' as CurrencyCode,
    locale: 'ru-RU',
    telegramNotifyChatId: '',
  });

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await config.refresh();
      if (config.config) {
        form.companyName = config.config.companyName;
        form.whatsappPhone = config.config.whatsappPhone;
        form.currency = config.config.currency;
        form.locale = config.config.locale;
        form.telegramNotifyChatId = config.config.telegramNotifyChatId ?? '';
      }
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  async function save(): Promise<void> {
    saveError.value = null;
    saved.value = false;
    if (!form.companyName.trim()) {
      saveError.value = 'Укажите название компании.';
      return;
    }
    saving.value = true;
    try {
      const payload: UpdateSystemConfigInput = {
        companyName: form.companyName.trim(),
        whatsappPhone: form.whatsappPhone.trim(),
        currency: form.currency,
        locale: form.locale,
        telegramNotifyChatId: form.telegramNotifyChatId.trim() || null,
      };
      await config.update(payload);
      saved.value = true;
      setTimeout(() => {
        saved.value = false;
      }, 2500);
    } catch (e) {
      saveError.value = errorMessage(e);
    } finally {
      saving.value = false;
    }
  }

  // ── «Мой Telegram»: link the current user's account via the bot deep link ──

  const tgUsername = computed(() => auth.user?.telegramUsername ?? null);
  const tgLinked = computed(() => Boolean(auth.user?.telegramId));
  const tgWaiting = ref(false);
  const tgDeepLink = ref<string | null>(null);
  const tgError = ref<string | null>(null);
  const tgNonce = ref<string | null>(null);
  let tgPollTimer: number | undefined;
  // Popup handle — closed + refocused on confirm so the admin isn't left on the
  // Telegram tab having to switch back manually.
  let tgPopup: Window | null = null;

  const isDev = import.meta.env.DEV;

  async function telegramLink(): Promise<void> {
    tgError.value = null;
    // Open the popup synchronously within the click gesture (blocker-safe).
    tgPopup = window.open('', 'easygo_tg', 'width=520,height=700');
    try {
      const res = await api.auth.telegramLinkStart();
      tgNonce.value = res.nonce;
      tgDeepLink.value = res.deepLink;
      tgWaiting.value = true;
      if (res.deepLink && tgPopup && !tgPopup.closed) tgPopup.location.href = res.deepLink;
      else if (res.deepLink) window.open(res.deepLink, '_blank'); // popup blocked → plain tab
      else tgPopup?.close(); // dev without a bot
      window.clearInterval(tgPollTimer);
      tgPollTimer = window.setInterval(pollLink, 2000);
    } catch (e) {
      tgPopup?.close();
      tgPopup = null;
      tgError.value = errorMessage(e);
    }
  }

  async function pollLink(): Promise<void> {
    if (!tgNonce.value) return;
    try {
      const res = await api.auth.telegramLinkPoll(tgNonce.value);
      if (res.status === 'pending') return;
      cancelLink();
      if (res.status === 'confirmed') {
        await auth.fetchMe();
      } else if (res.status === 'error') {
        tgError.value = res.message;
      } else {
        tgError.value = 'Время ожидания истекло, попробуйте ещё раз';
      }
    } catch {
      // Network hiccup — keep polling until the nonce expires.
    }
  }

  async function telegramDevConfirm(): Promise<void> {
    if (!tgNonce.value) return;
    try {
      await api.auth.telegramDevConfirm(tgNonce.value);
    } catch (e) {
      tgError.value = errorMessage(e);
    }
  }

  function cancelLink(): void {
    window.clearInterval(tgPollTimer);
    tgPopup?.close();
    tgPopup = null;
    window.focus();
    tgWaiting.value = false;
    tgNonce.value = null;
  }

  async function telegramUnlink(): Promise<void> {
    if (!window.confirm('Отвязать Telegram? Вход через бота станет недоступен.')) return;
    tgError.value = null;
    try {
      await api.auth.telegramUnlink();
      await auth.fetchMe();
    } catch (e) {
      tgError.value = errorMessage(e);
    }
  }

  onMounted(load);
  onUnmounted(() => window.clearInterval(tgPollTimer));

  return {
    loading,
    error,
    saving,
    saveError,
    saved,
    currencies,
    locales,
    form,
    load,
    save,
    // Telegram linking
    tgLinked,
    tgUsername,
    tgWaiting,
    tgDeepLink,
    tgError,
    telegramLink,
    telegramDevConfirm,
    cancelLink,
    telegramUnlink,
    isDev,
  };
}
