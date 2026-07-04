import { computed, onMounted, reactive, ref } from 'vue';
import type { Car, CarFeature, CarStatus, CarType, CreateCarInput, Driver } from '@easygo/shared';
import { CAR_FEATURE_LABEL, CAR_STATUS_LABEL, CAR_TYPE_LABEL, CAR_TYPE_SEAT_OPTIONS, CarFeature as CarFeatureEnum, carTypeSeats, CITIES } from '@easygo/shared';
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
  const types: CarType[] = ['SEDAN', 'MINIVAN', 'BUS'];
  const featureOptions = CarFeatureEnum.options.map((value) => ({ value, label: CAR_FEATURE_LABEL[value] }));

  const formData = reactive({
    model: 'KIA Carnival',
    plate: '',
    type: 'MINIVAN' as CarType,
    features: [] as CarFeature[],
    driverId: '' as string,
    seats: carTypeSeats('MINIVAN'),
    status: 'AVAILABLE' as CarStatus,
    locationCity: cities[0] as string,
  });

  function toggleFeature(value: CarFeature): void {
    formData.features = formData.features.includes(value)
      ? formData.features.filter((f) => f !== value)
      : [...formData.features, value];
  }

  /** Allowed seat options for the currently selected type. */
  const seatOptions = computed(() => CAR_TYPE_SEAT_OPTIONS[formData.type]);

  /** Snap seats to the type's allowed range when the type changes. */
  function onTypeChange(): void {
    const opts: readonly number[] = CAR_TYPE_SEAT_OPTIONS[formData.type];
    if (!opts.includes(formData.seats)) formData.seats = carTypeSeats(formData.type);
  }

  function resetForm(): void {
    formData.model = 'KIA Carnival';
    formData.plate = '';
    formData.type = 'MINIVAN';
    formData.features = [];
    formData.driverId = '';
    formData.seats = carTypeSeats('MINIVAN');
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
    formData.type = c.type;
    formData.features = [...c.features];
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
        type: formData.type,
        features: formData.features,
        driverId: formData.driverId || null,
        seats: Number(formData.seats) || carTypeSeats(formData.type),
        status: formData.status,
        locationCity: formData.locationCity || null,
      };
      if (editing.value) {
        await api.fleet.update(editing.value.id, payload);
      } else {
        await api.fleet.create(payload);
      }
      form.close(); // also clears the ?create=1 CTA flag from the URL
      await load();
    });
  }

  /** Cars grouped by their location city, ordered by CITIES; cars without a
   *  city fall into a trailing "Без города" group. */
  const carsByCity = computed(() => {
    const groups = new Map<string, Car[]>();
    for (const c of cars.value) {
      const key = c.locationCity ?? '';
      const bucket = groups.get(key);
      if (bucket) bucket.push(c);
      else groups.set(key, [c]);
    }
    const order = [...cities, ''];
    return [...groups.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([city, list]) => ({ city: city || 'Без города', cars: list }));
  });

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
    carsByCity,
    drivers,
    load,
    modalOpen: form.open,
    editing,
    saving: form.saving,
    formError: form.error,
    cities,
    statuses,
    types,
    featureOptions,
    toggleFeature,
    seatOptions,
    onTypeChange,
    form: formData,
    openCreate,
    openEdit,
    closeModal: form.close,
    save,
    driverName,
    CAR_STATUS_LABEL,
    CAR_TYPE_LABEL,
    CAR_FEATURE_LABEL,
  };
}
