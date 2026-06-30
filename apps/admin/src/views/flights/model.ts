import { computed, onMounted, reactive, ref, watch } from 'vue';
import type { Booking, Car, CreateFlightInput, FlightStatus, FlightView, Route } from '@easygo/shared';
import { BOOKING_STATUS_LABEL, FLIGHT_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { dateLabel, flightRouteLabel, routeLabel, timeLabel } from '@/lib/format';
import { useCrudList } from '@/composables/useCrudList';
import { useFormModel } from '@/composables/useFormModel';

/** Flights admin: card grid of upcoming flights with a create modal. The seat
 *  load bar (%/color) and the per-car seat default are bespoke and kept inline. */
export function useFlightsModel() {
  const routes = ref<Route[]>([]);
  const cars = ref<Car[]>([]);

  // List filters: by route (chips) and by calendar day. Empty = no filter.
  const routeFilter = ref<string>('');
  const dateFilter = ref<string>(''); // YYYY-MM-DD

  function buildQuery(): Record<string, string> {
    const q: Record<string, string> = {};
    if (routeFilter.value) q.routeId = routeFilter.value;
    if (dateFilter.value) {
      q.from = `${dateFilter.value}T00:00:00.000Z`;
      q.to = `${dateFilter.value}T23:59:59.999Z`;
    }
    return q;
  }

  const { loading, error, items: flights, load } = useCrudList<FlightView>(async () => {
    // Routes/cars are static metadata — fetch them once, then only re-query flights.
    const needMeta = routes.value.length === 0;
    const [f, r, c] = await Promise.all([
      api.flights.list(buildQuery()),
      needMeta ? api.routes.list() : Promise.resolve(routes.value),
      needMeta ? api.fleet.list() : Promise.resolve(cars.value),
    ]);
    routes.value = r;
    cars.value = c;
    return f;
  });

  function setRouteFilter(id: string): void {
    if (routeFilter.value === id) return;
    routeFilter.value = id;
    void load();
  }

  function setDateFilter(date: string): void {
    if (dateFilter.value === date) return;
    dateFilter.value = date;
    void load();
  }

  const form = useFormModel();
  const statuses: FlightStatus[] = ['SCHEDULED', 'CLOSED', 'DEPARTED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY'];

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

  /** A flight whose departure time is already in the past. */
  function isPast(f: FlightView): boolean {
    const d = new Date(f.departAt);
    return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
  }

  const MONTHS_GEN = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];

  // "1 июля" for the active date filter ('' when no day is selected).
  const dateFilterLabel = computed(() => {
    if (!dateFilter.value) return '';
    const [, m = '1', d = '1'] = dateFilter.value.split('-');
    return `${Number(d)} ${MONTHS_GEN[Number(m) - 1]}`;
  });

  // Heading reflects the active date filter; falls back to today when unfiltered.
  const todayLabel = computed(() => {
    if (dateFilterLabel.value) return dateFilterLabel.value;
    const now = new Date();
    return `Сегодня · ${now.getDate()} ${MONTHS_GEN[now.getMonth()]}`;
  });

  // ── Flight detail modal ──────────────────────────────────────────────────
  const detailOpen = ref(false);
  const detailFlight = ref<FlightView | null>(null);
  const detailBookings = ref<Booking[]>([]);
  const detailLoading = ref(false);
  const detailError = ref<string | null>(null);

  async function openDetail(f: FlightView): Promise<void> {
    detailFlight.value = f;
    detailOpen.value = true;
    detailLoading.value = true;
    detailError.value = null;
    detailBookings.value = [];
    detailStatusEdit.value = f.status;
    try {
      const res = await api.bookings.list({ flightId: f.id, limit: 100, offset: 0 });
      detailBookings.value = res.items;
    } catch (e) {
      detailError.value = errorMessage(e);
    } finally {
      detailLoading.value = false;
    }
  }

  function closeDetail(): void {
    detailOpen.value = false;
    detailFlight.value = null;
    detailBookings.value = [];
    detailStatusEdit.value = null;
    detailStatusSaving.value = false;
    detailStatusError.value = null;
  }

  const detailStatusEdit = ref<FlightStatus | null>(null);
  const detailStatusSaving = ref(false);
  const detailStatusError = ref<string | null>(null);

  async function saveDetailStatus(): Promise<void> {
    if (!detailFlight.value || !detailStatusEdit.value) return;
    if (detailStatusEdit.value === detailFlight.value.status) return;
    detailStatusSaving.value = true;
    detailStatusError.value = null;
    try {
      const updated = await api.flights.update(detailFlight.value.id, { status: detailStatusEdit.value });
      detailFlight.value = updated;
      const idx = flights.value.findIndex((f) => f.id === updated.id);
      if (idx !== -1) flights.value[idx] = updated;
    } catch (e) {
      detailStatusError.value = errorMessage(e);
    } finally {
      detailStatusSaving.value = false;
    }
  }

  // ── Flight payment (bulk mark paid / clear) ──────────────────────────────
  const detailPaymentSaving = ref(false);
  const detailPaymentError = ref<string | null>(null);

  async function setFlightPaid(paid: boolean): Promise<void> {
    if (!detailFlight.value) return;
    detailPaymentSaving.value = true;
    detailPaymentError.value = null;
    try {
      const updated = await api.flights.setPaymentStatus(detailFlight.value.id, paid ? 'PAID' : 'UNPAID');
      detailFlight.value = updated;
      const idx = flights.value.findIndex((f) => f.id === updated.id);
      if (idx !== -1) flights.value[idx] = updated;
      // The cascade changed each booking's payment status — refresh the list.
      const res = await api.bookings.list({ flightId: updated.id, limit: 100, offset: 0 });
      detailBookings.value = res.items;
    } catch (e) {
      detailPaymentError.value = errorMessage(e);
    } finally {
      detailPaymentSaving.value = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  form.watchCreateCta(openCreate);

  onMounted(load);

  return {
    loading,
    error,
    flights,
    routes,
    cars,
    load,
    routeFilter,
    dateFilter,
    setRouteFilter,
    setDateFilter,
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
    isPast,
    todayLabel,
    flightRouteLabel,
    routeLabel,
    timeLabel,
    dateLabel,
    FLIGHT_STATUS_LABEL,
    BOOKING_STATUS_LABEL,
    PAYMENT_STATUS_LABEL,
    detailOpen,
    detailFlight,
    detailBookings,
    detailLoading,
    detailError,
    openDetail,
    closeDetail,
    detailStatusEdit,
    detailStatusSaving,
    detailStatusError,
    saveDetailStatus,
    detailPaymentSaving,
    detailPaymentError,
    setFlightPaid,
  };
}
