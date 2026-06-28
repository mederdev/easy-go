import { ref, onMounted } from 'vue';
import type { Driver, FlightView } from '@easygo/shared';
import { FLIGHT_STATUS_LABEL } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useCrudList } from '@/composables/useCrudList';

interface DriverWithCars extends Driver {
  cars: Array<{ id: string; model: string; plate: string; seats: number }>;
  passwordHash?: string | null;
  passwordRaw?: string | null;
  isActive: boolean;
}

export function useDriversModel() {
  const { items: drivers, loading, error, load } = useCrudList<DriverWithCars>(
    () => api.drivers.list() as unknown as Promise<DriverWithCars[]>,
  );

  onMounted(load);

  // Detail modal
  const selected = ref<DriverWithCars | null>(null);
  const driverFlights = ref<FlightView[]>([]);
  const flightsLoading = ref(false);

  // Password form
  const pwOpen = ref(false);
  const pwValue = ref('');
  const pwSaving = ref(false);
  const pwError = ref<string | null>(null);
  const pwSuccess = ref(false);

  async function openDriver(d: DriverWithCars): Promise<void> {
    selected.value = d;
    driverFlights.value = [];
    flightsLoading.value = true;
    try {
      driverFlights.value = (await api.drivers.flights(d.id)) as FlightView[];
    } finally {
      flightsLoading.value = false;
    }
  }

  function closeDriver(): void {
    selected.value = null;
    driverFlights.value = [];
    pwOpen.value = false;
    pwValue.value = '';
    pwError.value = null;
    pwSuccess.value = false;
    statusError.value = null;
  }

  function openPw(): void {
    pwOpen.value = true;
    pwValue.value = '';
    pwError.value = null;
    pwSuccess.value = false;
  }

  const statusSaving = ref(false);
  const statusError = ref<string | null>(null);

  async function toggleActive(): Promise<void> {
    if (!selected.value || statusSaving.value) return;
    statusSaving.value = true;
    statusError.value = null;
    try {
      const updated = await api.drivers.update(selected.value.id, { isActive: !selected.value.isActive }) as DriverWithCars;
      await load();
      const fresh = (drivers.value as DriverWithCars[]).find((d) => d.id === selected.value!.id);
      selected.value = fresh ?? { ...selected.value, isActive: updated.isActive };
    } catch (e: unknown) {
      statusError.value = errorMessage(e);
    } finally {
      statusSaving.value = false;
    }
  }

  async function savePassword(): Promise<void> {
    if (!selected.value || !pwValue.value) return;
    pwSaving.value = true;
    pwError.value = null;
    pwSuccess.value = false;
    try {
      await api.drivers.setPassword(selected.value.id, { password: pwValue.value });
      pwSuccess.value = true;
      pwOpen.value = false;
      // Refresh driver list so access indicator updates
      await load();
      // Re-select with fresh data
      const fresh = (drivers.value as DriverWithCars[]).find((d) => d.id === selected.value!.id);
      if (fresh) selected.value = fresh;
    } catch (e: unknown) {
      pwError.value = errorMessage(e);
    } finally {
      pwSaving.value = false;
    }
  }

  function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  }

  function carLabel(d: DriverWithCars): string {
    if (!d.cars?.length) return '—';
    return d.cars.map((c) => `${c.model} · ${c.plate}`).join(', ');
  }

  function flightRoute(f: FlightView): string {
    return f.route ? `${f.route.fromCity} → ${f.route.toCity}` : '—';
  }

  function flightDate(f: FlightView): string {
    return new Date(f.departAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function flightCar(f: FlightView): string {
    const car = (f as unknown as { car?: { model: string; plate: string } }).car;
    return car ? `${car.model} · ${car.plate}` : '—';
  }

  return {
    drivers,
    loading,
    error,
    load,
    selected,
    driverFlights,
    flightsLoading,
    pwOpen,
    pwValue,
    pwSaving,
    pwError,
    pwSuccess,
    openDriver,
    closeDriver,
    openPw,
    savePassword,
    statusSaving,
    statusError,
    toggleActive,
    initials,
    carLabel,
    flightRoute,
    flightDate,
    flightCar,
    FLIGHT_STATUS_LABEL,
  };
}
