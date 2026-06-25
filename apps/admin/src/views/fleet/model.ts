import { onMounted, reactive, ref } from 'vue';
import type { Car, CarStatus, CreateCarInput, Driver } from '@easygo/shared';
import { CAR_STATUS_LABEL, CITIES } from '@easygo/shared';
import { api } from '@/lib/api';
import { useCrudList } from '@/composables/useCrudList';
import { useFormModel } from '@/composables/useFormModel';

/** Fleet admin: card grid of cars with a create/edit modal. */
export function useFleetModel() {
  const drivers = ref<Driver[]>([]);

  const { loading, error, items: cars, load } = useCrudList<Car>(async () => {
    const [carList, driverList] = await Promise.all([api.fleet.list(), api.drivers.list()]);
    drivers.value = driverList;
    return carList;
  });

  const form = useFormModel();
  const editing = ref<Car | null>(null);

  const cities = CITIES;
  const statuses: CarStatus[] = ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE'];

  const formData = reactive({
    model: 'KIA Carnival',
    plate: '',
    driverId: '' as string,
    seats: 11,
    status: 'AVAILABLE' as CarStatus,
    locationCity: cities[0] as string,
  });

  function resetForm(): void {
    formData.model = 'KIA Carnival';
    formData.plate = '';
    formData.driverId = '';
    formData.seats = 11;
    formData.status = 'AVAILABLE';
    formData.locationCity = cities[0];
  }

  function openCreate(): void {
    editing.value = null;
    resetForm();
    form.error.value = null;
    form.open.value = true;
  }

  function openEdit(c: Car): void {
    editing.value = c;
    formData.model = c.model;
    formData.plate = c.plate;
    formData.driverId = c.driverId ?? '';
    formData.seats = c.seats;
    formData.status = c.status;
    formData.locationCity = c.locationCity ?? cities[0];
    form.error.value = null;
    form.open.value = true;
  }

  async function save(): Promise<void> {
    form.error.value = null;
    if (!formData.model.trim() || !formData.plate.trim()) {
      form.error.value = 'Укажите модель и госномер.';
      return;
    }
    await form.submit(async () => {
      const payload: CreateCarInput = {
        model: formData.model.trim(),
        plate: formData.plate.trim(),
        driverId: formData.driverId || null,
        seats: Number(formData.seats) || 11,
        status: formData.status,
        locationCity: formData.locationCity || null,
      };
      if (editing.value) {
        await api.fleet.update(editing.value.id, payload);
      } else {
        await api.fleet.create(payload);
      }
      form.open.value = false;
      await load();
    });
  }

  function driverName(c: Car): string {
    if (c.driver) return c.driver.name;
    const found = drivers.value.find((d) => d.id === c.driverId);
    return found?.name ?? '—';
  }

  form.watchCreateCta(openCreate);

  onMounted(load);

  return {
    loading,
    error,
    cars,
    drivers,
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
    driverName,
    CAR_STATUS_LABEL,
  };
}
