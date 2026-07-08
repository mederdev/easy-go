import { ref, reactive, computed, onMounted } from 'vue';
import type { Car, Driver, FlightView } from '@easygo/shared';
import { FLIGHT_STATUS_LABEL } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useCrudList } from '@/composables/useCrudList';
import { useFormModel } from '@/composables/useFormModel';

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

  // Create modal (opened by the topbar CTA via ?create=1)
  const createForm = useFormModel();
  const createData = reactive({ name: '', phone: '+996 ', experience: '', password: '' });

  function openCreate(): void {
    createData.name = '';
    createData.phone = '+996 ';
    createData.experience = '';
    createData.password = '';
    createForm.error.value = null;
    createForm.open.value = true;
  }

  async function saveDriver(): Promise<void> {
    createForm.error.value = null;
    if (!createData.name.trim()) {
      createForm.error.value = 'Укажите имя водителя.';
      return;
    }
    if (createData.phone.replace(/\D/g, '').length < 9) {
      createForm.error.value = 'Укажите номер телефона.';
      return;
    }
    if (createData.password && createData.password.length < 6) {
      createForm.error.value = 'Пароль должен быть не короче 6 символов.';
      return;
    }
    await createForm.submit(async () => {
      const created = await api.drivers.create({
        name: createData.name.trim(),
        phone: createData.phone.trim(),
        experience: createData.experience.trim() || undefined,
      });
      if (createData.password) {
        await api.drivers.setPassword(created.id, { password: createData.password });
      }
      createForm.close(); // also clears the ?create=1 CTA flag from the URL
      await load();
    });
  }

  createForm.watchCreateCta(openCreate);

  // Edit modal (opened from the driver detail modal). Bundles the driver's
  // profile, active status, and car assignment into a single save.
  const editForm = useFormModel();
  const editData = reactive({
    name: '',
    phone: '',
    experience: '',
    isActive: true,
    carIds: [] as string[],
  });

  // Cars offered in the picker: every AVAILABLE car (not on a trip) plus the
  // driver's own cars, so a car already on a trip still shows as selected. A car
  // held by another driver is shown with a `takenBy` note — picking it reassigns.
  const availableCars = ref<Car[]>([]);
  const carOptions = computed<Array<{ id: string; model: string; plate: string; takenBy?: string }>>(() => {
    const map = new Map<string, { id: string; model: string; plate: string; takenBy?: string }>();
    for (const c of selected.value?.cars ?? []) {
      map.set(c.id, { id: c.id, model: c.model, plate: c.plate });
    }
    for (const c of availableCars.value) {
      if (map.has(c.id)) continue;
      const takenBy =
        c.driverId && c.driverId !== selected.value?.id
          ? (drivers.value as DriverWithCars[]).find((d) => d.id === c.driverId)?.name
          : undefined;
      map.set(c.id, { id: c.id, model: c.model, plate: c.plate, takenBy });
    }
    return [...map.values()];
  });

  function toggleCarId(id: string): void {
    editData.carIds = editData.carIds.includes(id)
      ? editData.carIds.filter((x) => x !== id)
      : [...editData.carIds, id];
  }

  async function openEdit(): Promise<void> {
    if (!selected.value) return;
    editData.name = selected.value.name;
    editData.phone = selected.value.phone;
    editData.experience = selected.value.experience ?? '';
    editData.isActive = selected.value.isActive;
    editData.carIds = (selected.value.cars ?? []).map((c) => c.id);
    editForm.error.value = null;
    editForm.open.value = true;
    try {
      availableCars.value = (await api.fleet.available()) as Car[];
    } catch {
      availableCars.value = [];
    }
  }

  function closeEdit(): void {
    editForm.open.value = false;
    editForm.error.value = null;
  }

  async function saveEdit(): Promise<void> {
    if (!selected.value) return;
    editForm.error.value = null;
    if (!editData.name.trim()) {
      editForm.error.value = 'Укажите имя водителя.';
      return;
    }
    if (editData.phone.replace(/\D/g, '').length < 9) {
      editForm.error.value = 'Укажите номер телефона.';
      return;
    }
    const driver = selected.value;
    const driverId = driver.id;
    const currentIds = new Set((driver.cars ?? []).map((c) => c.id));
    const nextIds = new Set(editData.carIds);
    const toAssign = editData.carIds.filter((id) => !currentIds.has(id));
    const toUnassign = [...currentIds].filter((id) => !nextIds.has(id));
    await editForm.submit(async () => {
      // Profile + status first, so a deactivation conflict aborts before we
      // touch any car assignment.
      await api.drivers.update(driverId, {
        name: editData.name.trim(),
        phone: editData.phone.trim(),
        experience: editData.experience.trim() || undefined,
        isActive: editData.isActive,
      });
      for (const id of toUnassign) await api.fleet.update(id, { driverId: null });
      for (const id of toAssign) await api.fleet.update(id, { driverId });
      editForm.open.value = false;
      await load();
      const fresh = (drivers.value as DriverWithCars[]).find((d) => d.id === driverId);
      if (fresh) selected.value = fresh;
    });
  }

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
    deleteConfirm.value = false;
    deleteError.value = null;
    closeEdit();
  }

  // Deletion (admin/owner; API refuses while the driver has flights)
  const deleteConfirm = ref(false);
  const deleting = ref(false);
  const deleteError = ref<string | null>(null);

  async function deleteDriver(): Promise<void> {
    if (!selected.value || deleting.value) return;
    if (!deleteConfirm.value) {
      deleteConfirm.value = true;
      deleteError.value = null;
      return;
    }
    deleting.value = true;
    deleteError.value = null;
    try {
      await api.drivers.delete(selected.value.id);
      closeDriver();
      await load();
    } catch (e: unknown) {
      deleteError.value = errorMessage(e);
      deleteConfirm.value = false;
    } finally {
      deleting.value = false;
    }
  }

  function cancelDelete(): void {
    deleteConfirm.value = false;
    deleteError.value = null;
  }

  function openPw(): void {
    pwOpen.value = true;
    pwValue.value = '';
    pwError.value = null;
    pwSuccess.value = false;
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
    createOpen: createForm.open,
    createSaving: createForm.saving,
    createError: createForm.error,
    createData,
    openCreate,
    closeCreate: createForm.close,
    saveDriver,
    editOpen: editForm.open,
    editSaving: editForm.saving,
    editError: editForm.error,
    editData,
    carOptions,
    toggleCarId,
    openEdit,
    closeEdit,
    saveEdit,
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
    deleteConfirm,
    deleting,
    deleteError,
    deleteDriver,
    cancelDelete,
    initials,
    carLabel,
    flightRoute,
    flightDate,
    flightCar,
    FLIGHT_STATUS_LABEL,
  };
}
