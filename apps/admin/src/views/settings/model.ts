import { onMounted, reactive, ref } from 'vue';
import type { CurrencyCode, UpdateSystemConfigInput } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';

/** System settings: company + regional config form with load and save. */
export function useSettingsModel() {
  const config = useConfigStore();

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

  onMounted(load);

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
  };
}
