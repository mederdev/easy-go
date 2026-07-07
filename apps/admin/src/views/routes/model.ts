import { onMounted, reactive, ref } from 'vue';
import type { CreateRouteInput, Route, RouteStatus } from '@easygo/shared';
import { CITIES, ROUTE_STATUS_LABEL, formatMoney, toMajor, toMinor } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { routeLabel } from '@/lib/format';
import { useCrudList } from '@/composables/useCrudList';
import { useFormModel } from '@/composables/useFormModel';

/** Routes admin: list of directions with a create/edit modal and delete. */
export function useRoutesModel() {
  const config = useConfigStore();

  const { loading, error, items: routes, load } = useCrudList<Route>(async () => {
    await config.ensure();
    return api.routes.list();
  });

  const form = useFormModel();
  const editing = ref<Route | null>(null);

  const cities = CITIES;
  const statuses: RouteStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

  const formData = reactive({
    fromCity: cities[0] as string,
    toCity: cities[1] as string,
    durationLabel: '',
    priceMajor: '' as string,
    dailyTrips: 0,
    status: 'ACTIVE' as RouteStatus,
    popular: false,
  });

  function money(minor: number): string {
    return formatMoney(minor, config.currency, config.locale);
  }

  function resetForm(): void {
    formData.fromCity = cities[0];
    formData.toCity = cities[1];
    formData.durationLabel = '';
    formData.priceMajor = '';
    formData.dailyTrips = 0;
    formData.status = 'ACTIVE';
    formData.popular = false;
  }

  function openCreate(): void {
    editing.value = null;
    resetForm();
    form.error.value = null;
    form.open.value = true;
  }

  function openEdit(r: Route): void {
    editing.value = r;
    formData.fromCity = r.fromCity;
    formData.toCity = r.toCity;
    formData.durationLabel = r.durationLabel;
    formData.priceMajor = String(toMajor(r.price, config.currency));
    formData.dailyTrips = r.dailyTrips;
    formData.status = r.status;
    formData.popular = r.popular;
    form.error.value = null;
    form.open.value = true;
  }

  async function save(): Promise<void> {
    form.error.value = null;
    const fromCity = formData.fromCity.trim();
    const toCity = formData.toCity.trim();
    if (!fromCity || !toCity) {
      form.error.value = 'Укажите города отправления и назначения.';
      return;
    }
    if (fromCity === toCity) {
      form.error.value = 'Города отправления и назначения должны различаться.';
      return;
    }
    if (!formData.durationLabel.trim()) {
      form.error.value = 'Укажите время в пути.';
      return;
    }
    const priceNum = Number(String(formData.priceMajor).replace(',', '.'));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      form.error.value = 'Укажите корректную цену.';
      return;
    }
    await form.submit(async () => {
      const payload: CreateRouteInput = {
        fromCity,
        toCity,
        durationLabel: formData.durationLabel.trim(),
        price: toMinor(priceNum, config.currency),
        dailyTrips: Number(formData.dailyTrips) || 0,
        status: formData.status,
        popular: formData.popular,
      };
      if (editing.value) {
        await api.routes.update(editing.value.id, payload);
      } else {
        await api.routes.create(payload);
      }
      form.close(); // also clears the ?create=1 CTA flag from the URL
      await load();
    });
  }

  async function remove(r: Route): Promise<void> {
    if (!window.confirm(`Удалить маршрут «${routeLabel(r)}»?`)) return;
    try {
      await api.routes.remove(r.id);
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
    routes,
    load,
    modalOpen: form.open,
    editing,
    saving: form.saving,
    formError: form.error,
    cities,
    statuses,
    form: formData,
    openCreate,
    openEdit,
    closeModal: form.close,
    save,
    remove,
    money,
    routeLabel,
    ROUTE_STATUS_LABEL,
  };
}
