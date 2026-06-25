import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { Car, CreateFlightInput, FlightStatus, FlightView, Route } from '@easygo/shared';
import { FLIGHT_STATUS_LABEL } from '@easygo/shared';
import { api } from '@/lib/api';
import { flightRouteLabel, routeLabel, timeLabel } from '@/lib/format';
import { useCrudList } from '@/composables/useCrudList';
import { useFormModel } from '@/composables/useFormModel';

/** Flights admin: card grid of upcoming flights with a create modal. The seat
 *  load bar (%/color) and the per-car seat default are bespoke and kept inline. */
export function useFlightsModel() {
  const routes = ref<Route[]>([]);
  const cars = ref<Car[]>([]);

  const { loading, error, items: flights, load } = useCrudList<FlightView>(async () => {
    const [f, r, c] = await Promise.all([api.flights.list(), api.routes.list(), api.fleet.list()]);
    routes.value = r;
    cars.value = c;
    return f;
  });

  const form = useFormModel();
  const statuses: FlightStatus[] = ['SCHEDULED', 'CLOSED', 'DEPARTED', 'CANCELLED'];

  function todayStr(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  const formData = reactive({
    routeId: '',
    carId: '',
    date: todayStr(),
    time: '14:00',
    seatsTotal: 11,
    pickupAddress: '',
    status: 'SCHEDULED' as FlightStatus,
  });

  function openCreate(): void {
    form.error.value = null;
    formData.routeId = routes.value[0]?.id ?? '';
    formData.carId = '';
    formData.date = todayStr();
    formData.time = '14:00';
    formData.seatsTotal = 11;
    formData.pickupAddress = '';
    formData.status = 'SCHEDULED';
    form.open.value = true;
  }

  // Default seat count to the chosen car's capacity.
  watch(
    () => formData.carId,
    (id) => {
      const car = cars.value.find((c) => c.id === id);
      if (car) formData.seatsTotal = car.seats;
    },
  );

  async function save(): Promise<void> {
    form.error.value = null;
    if (!formData.routeId) {
      form.error.value = 'Выберите маршрут.';
      return;
    }
    const depart = new Date(`${formData.date}T${formData.time}:00`);
    if (Number.isNaN(depart.getTime())) {
      form.error.value = 'Укажите корректную дату и время.';
      return;
    }
    await form.submit(async () => {
      const payload: CreateFlightInput = {
        routeId: formData.routeId,
        carId: formData.carId || null,
        departAt: depart.toISOString(),
        seatsTotal: Number(formData.seatsTotal) || 11,
        pickupAddress: formData.pickupAddress.trim() || null,
        status: formData.status,
      };
      await api.flights.create(payload);
      form.open.value = false;
      await load();
    });
  }

  function pct(f: FlightView): number {
    if (f.seatsTotal <= 0) return 0;
    return Math.round((f.seatsTaken / f.seatsTotal) * 100);
  }

  function barColor(f: FlightView): string {
    if (f.soldOut) return '#C0492E';
    if (f.fewSeats) return '#C77A18';
    return '#56A919';
  }

  const todayLabel = computed(() => {
    const d = new Date();
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    return `Сегодня · ${d.getDate()} ${months[d.getMonth()]}`;
  });

  form.watchCreateCta(openCreate);

  onMounted(load);

  return {
    loading,
    error,
    flights,
    routes,
    cars,
    load,
    modalOpen: form.open,
    saving: form.saving,
    formError: form.error,
    statuses,
    form: formData,
    openCreate,
    closeModal: form.close,
    save,
    pct,
    barColor,
    todayLabel,
    flightRouteLabel,
    routeLabel,
    timeLabel,
    FLIGHT_STATUS_LABEL,
  };
}
