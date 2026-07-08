import { onMounted, reactive, ref } from 'vue';
import type { ServiceAddon } from '@easygo/shared';
import { formatMoney, toMajor, toMinor } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { useCrudList } from '@/composables/useCrudList';
import { useFormModel } from '@/composables/useFormModel';

/** Доп. услуги: catalog of paid extra services with a create/edit modal and delete. */
export function useServiceAddonsModel() {
  const config = useConfigStore();

  const { loading, error, items: addons, load } = useCrudList<ServiceAddon>(async () => {
    await config.ensure();
    return api.serviceAddons.list();
  });

  const form = useFormModel();
  const editing = ref<ServiceAddon | null>(null);

  const formData = reactive({
    name: '',
    priceMajor: '' as string,
  });

  function money(minor: number): string {
    return formatMoney(minor, config.currency, config.locale);
  }

  function resetForm(): void {
    formData.name = '';
    formData.priceMajor = '';
  }

  function openCreate(): void {
    editing.value = null;
    resetForm();
    form.error.value = null;
    form.open.value = true;
  }

  function openEdit(a: ServiceAddon): void {
    editing.value = a;
    formData.name = a.name;
    formData.priceMajor = String(toMajor(a.price, config.currency));
    form.error.value = null;
    form.open.value = true;
  }

  async function save(): Promise<void> {
    form.error.value = null;
    const name = formData.name.trim();
    if (!name) {
      form.error.value = 'Укажите название услуги.';
      return;
    }
    const priceNum = Number(String(formData.priceMajor).replace(',', '.'));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      form.error.value = 'Укажите корректную цену.';
      return;
    }
    await form.submit(async () => {
      const price = toMinor(priceNum, config.currency);
      if (editing.value) {
        await api.serviceAddons.update(editing.value.id, { name, price });
      } else {
        await api.serviceAddons.create({ name, price });
      }
      form.close(); // also clears the ?create=1 CTA flag from the URL
      await load();
    });
  }

  async function remove(a: ServiceAddon): Promise<void> {
    if (!window.confirm(`Удалить услугу «${a.name}»?`)) return;
    try {
      await api.serviceAddons.remove(a.id);
      await load();
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  form.watchCreateCta(openCreate);

  onMounted(load);

  return {
    config,
    loading,
    error,
    addons,
    load,
    modalOpen: form.open,
    editing,
    saving: form.saving,
    formError: form.error,
    form: formData,
    openCreate,
    openEdit,
    closeModal: form.close,
    save,
    remove,
    money,
  };
}
