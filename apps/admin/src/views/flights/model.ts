import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Booking, Car, CreateFlightInput, FlightStatus, FlightView, Route, UpdateFlightInput } from '@easygo/shared';
import { BOOKING_STATUS_LABEL, FLIGHT_STATUS_LABEL, PAYMENT_STATUS_LABEL, formatMoney } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { dateLabel, flightRouteLabel, routeLabel, timeLabel } from '@/lib/format';
import { useConfigStore } from '@/stores/config';
import { useCrudList } from '@/composables/useCrudList';
import { useFormModel } from '@/composables/useFormModel';

/** Flights admin: card grid of upcoming flights with a create modal. The seat
 *  load bar (%/color) and the per-car seat default are bespoke and kept inline. */
export function useFlightsModel() {
  const router = useRouter();
  const config = useConfigStore();
  const routes = ref<Route[]>([]);
  const cars = ref<Car[]>([]);

  // Only active routes can be used for new flights; draft/archived directions
  // stay in `routes` so the filter chips can still narrow to their old flights.
  const activeRoutes = computed(() => routes.value.filter((r) => r.status === 'ACTIVE'));

  function money(minor: number): string {
    return formatMoney(minor, config.currency, config.locale);
  }

  /** Amount still owed on a booking (minor units), never negative. */
  function remaining(b: Booking): number {
    return Math.max(0, b.total - b.prepaid);
  }

  /** Jump to the Bookings page and open this booking's detail drawer. */
  function openBookingDetail(b: Booking): void {
    void router.push({ name: 'bookings', query: { open: b.id } });
  }

  // List filters: by route (chips) and by calendar day. Empty = no filter.
  const routeFilter = ref<string>('');
  const dateFilter = ref<string>(''); // YYYY-MM-DD
  // Status tab: 'active' shows only open & upcoming flights (default), 'all' shows every flight.
  const statusFilter = ref<'active' | 'all'>('active');

  function buildQuery(): Record<string, string> {
    const q: Record<string, string> = {};
    if (routeFilter.value) q.routeId = routeFilter.value;
    if (dateFilter.value) {
      q.from = `${dateFilter.value}T00:00:00.000Z`;
      q.to = `${dateFilter.value}T23:59:59.999Z`;
    }
    return q;
  }

  const { loading, error, items: rawFlights, load } = useCrudList<FlightView>(async () => {
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

  // The "Активные" tab narrows to open & upcoming flights; "Все" keeps them all
  // but floats active ones first. Within each group show the freshest
  // (latest departure) first — the API returns them oldest-first.
  const byDepartDesc = (a: FlightView, b: FlightView) =>
    new Date(b.departAt).getTime() - new Date(a.departAt).getTime();
  const flights = computed(() => {
    const list = statusFilter.value === 'active'
      ? rawFlights.value.filter(isActive).sort(byDepartDesc)
      : [...rawFlights.value].sort(
          (a, b) => Number(!isActive(a)) - Number(!isActive(b)) || byDepartDesc(a, b),
        );
    return list;
  });

  function setStatusFilter(v: 'active' | 'all'): void {
    if (statusFilter.value === v && routeFilter.value === '') return;
    statusFilter.value = v;
    // "Активные" is a peer of the route chips — clear any route selection.
    if (routeFilter.value !== '') {
      routeFilter.value = '';
      availableDates.value = new Set();
      loadedRanges.clear();
      void load();
    }
  }

  // ── Calendar "has flights" dots ──────────────────────────────────────────
  // ISO days (YYYY-MM-DD) that have ≥1 flight, for the months the user has viewed.
  const availableDates = ref<Set<string>>(new Set());
  // Ranges already fetched (keyed by route + window) so we don't refetch needlessly.
  const loadedRanges = new Set<string>();

  async function loadAvailableDates(from: string, to: string): Promise<void> {
    const key = `${routeFilter.value}_${from}_${to}`;
    if (loadedRanges.has(key)) return;
    loadedRanges.add(key);
    try {
      const q: Record<string, string> = {
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
      };
      if (routeFilter.value) q.routeId = routeFilter.value;
      const fs = await api.flights.list(q);
      // departAt is UTC ISO; slice matches the UTC-day filter semantics used elsewhere.
      const days = fs.map((f) => f.departAt.slice(0, 10));
      availableDates.value = new Set([...availableDates.value, ...days]);
    } catch {
      // non-critical — dots just won't show; allow a retry later
      loadedRanges.delete(key);
    }
  }

  /** Called by the calendar when the user navigates to / opens a month. */
  function onCalendarRange(range: { from: string; to: string }): void {
    void loadAvailableDates(range.from, range.to);
  }

  const highlightedDates = computed(() => [...availableDates.value]);

  function setRouteFilter(id: string): void {
    // Selecting "Все маршруты" or a specific route switches off the active-only tab.
    if (routeFilter.value === id && statusFilter.value === 'all') return;
    statusFilter.value = 'all';
    routeFilter.value = id;
    // Dots depend on the route filter — drop cached days so the calendar refetches.
    availableDates.value = new Set();
    loadedRanges.clear();
    void load();
  }

  function setDateFilter(date: string): void {
    if (dateFilter.value === date) return;
    dateFilter.value = date;
    void load();
  }

  const form = useFormModel();
  const statuses: FlightStatus[] = ['SCHEDULED', 'CLOSED', 'DEPARTED', 'COMPLETED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY'];

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
    dropoffAddress: '',
    status: 'SCHEDULED' as FlightStatus,
  });

  // Which flight is being edited (null = the modal creates a new flight).
  const editingId = ref<string | null>(null);
  const isEditing = computed(() => editingId.value !== null);

  function openCreate(): void {
    form.error.value = null;
    editingId.value = null;
    formData.routeId = activeRoutes.value[0]?.id ?? '';
    formData.carId = '';
    formData.date = todayStr();
    formData.time = '14:00';
    formData.seatsTotal = 11;
    formData.pickupAddress = '';
    formData.dropoffAddress = '';
    formData.status = 'SCHEDULED';
    form.open.value = true;
    void loadTakenCars();
  }

  /** Split an ISO instant into the local YYYY-MM-DD / HH:MM the form inputs use
   *  (mirrors how `save()` reads them back as local time). */
  function localParts(iso: string): { date: string; time: string } {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
      time: `${p(d.getHours())}:${p(d.getMinutes())}`,
    };
  }

  /** Open the same modal pre-filled from an existing flight for editing. */
  async function openEdit(f: FlightView): Promise<void> {
    form.error.value = null;
    editingId.value = f.id;
    const { date, time } = localParts(f.departAt);
    formData.routeId = f.routeId;
    formData.carId = f.carId ?? '';
    formData.date = date;
    formData.time = time;
    formData.pickupAddress = f.pickupAddress ?? '';
    formData.dropoffAddress = f.dropoffAddress ?? '';
    formData.status = f.status;
    form.open.value = true;
    void loadTakenCars();
    // Setting carId queues the seat-default watcher; apply the flight's own
    // seat count after it flushes so we keep the real value, not the car's cap.
    await nextTick();
    formData.seatsTotal = f.seatsTotal;
  }

  /** Close the detail modal and reopen the form in edit mode for that flight. */
  function openEditFromDetail(): void {
    const f = detailFlight.value;
    if (!f) return;
    closeDetail();
    void openEdit(f);
  }

  // Route <select> options: active routes, plus the edited flight's own route
  // even if it's since been archived/drafted (so its value stays selectable).
  const routeOptions = computed(() => {
    const opts = [...activeRoutes.value];
    if (formData.routeId && !opts.some((r) => r.id === formData.routeId)) {
      const r = routes.value.find((x) => x.id === formData.routeId);
      if (r) opts.push(r);
    }
    return opts;
  });

  // Cars already assigned to another (non-cancelled) flight on the form's chosen
  // day — the API rejects double-booking, so we hide them from the picker too.
  const CANCELLED_STATUSES: FlightStatus[] = [
    'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY',
  ];
  const takenCarIds = ref<Set<string>>(new Set());

  async function loadTakenCars(): Promise<void> {
    const date = formData.date;
    if (!date) {
      takenCarIds.value = new Set();
      return;
    }
    try {
      const fs = await api.flights.list({
        from: `${date}T00:00:00.000Z`,
        to: `${date}T23:59:59.999Z`,
      });
      const busy = new Set<string>();
      for (const f of fs) {
        // The flight being edited doesn't conflict with itself.
        if (editingId.value && f.id === editingId.value) continue;
        if (f.carId && !CANCELLED_STATUSES.includes(f.status)) busy.add(f.carId);
      }
      takenCarIds.value = busy;
    } catch {
      // Non-critical: fall back to showing all cars; the API still guards saves.
      takenCarIds.value = new Set();
    }
  }

  // Refresh availability whenever the picked day changes while the form is open.
  watch(
    () => formData.date,
    () => {
      if (form.open.value) void loadTakenCars();
    },
  );

  // Cars offered in the form: free on the chosen day, plus the flight's own car
  // (which never counts as a conflict with itself) so its value stays selectable.
  const availableCars = computed(() =>
    cars.value.filter((c) => !takenCarIds.value.has(c.id) || c.id === formData.carId),
  );

  // The chosen car's capacity caps the seat count ('' = no car → no cap).
  const maxSeats = computed(() => {
    const car = cars.value.find((c) => c.id === formData.carId);
    return car ? car.seats : null;
  });

  // Selecting a car defaults seats to its capacity; typing above the cap
  // (or switching to a smaller car) clamps the value back down.
  watch(
    () => formData.carId,
    (id) => {
      const car = cars.value.find((c) => c.id === id);
      if (car) formData.seatsTotal = car.seats;
    },
  );
  watch(
    () => formData.seatsTotal,
    (n) => {
      if (maxSeats.value !== null && n > maxSeats.value) formData.seatsTotal = maxSeats.value;
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
        dropoffAddress: formData.dropoffAddress.trim() || null,
        status: formData.status,
      };
      if (editingId.value) {
        await api.flights.update(editingId.value, payload);
      } else {
        await api.flights.create(payload);
      }
      form.close(); // also clears the ?create=1 CTA flag from the URL
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

  /** A flight whose departure day is before today (time-of-day ignored, so a
   *  flight leaving earlier today still counts as current/active). */
  function isPast(f: FlightView): boolean {
    const d = new Date(f.departAt);
    if (Number.isNaN(d.getTime())) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return d.getTime() < startOfToday.getTime();
  }

  // Terminal states: the flight is finished or called off — never "active".
  const TERMINAL_STATUSES: FlightStatus[] = [
    'COMPLETED', 'CANCELLED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY',
  ];

  /** An active flight: a live (non-terminal) flight whose departure day is
   *  today or later — so any of today's flights count as active. */
  function isActive(f: FlightView): boolean {
    return !TERMINAL_STATUSES.includes(f.status) && !isPast(f);
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

  // Whether the quick status selector differs from the loaded flight. Car and
  // everything else are edited through the full edit form, not this modal.
  const detailDirty = computed(() => {
    const f = detailFlight.value;
    if (!f) return false;
    return detailStatusEdit.value !== null && detailStatusEdit.value !== f.status;
  });

  async function saveDetailChanges(): Promise<void> {
    const f = detailFlight.value;
    if (!f) return;
    const patch: UpdateFlightInput = {};
    if (detailStatusEdit.value !== null && detailStatusEdit.value !== f.status) {
      patch.status = detailStatusEdit.value;
    }
    if (Object.keys(patch).length === 0) return;
    detailStatusSaving.value = true;
    detailStatusError.value = null;
    try {
      const updated = await api.flights.update(f.id, patch);
      detailFlight.value = updated;
      const idx = rawFlights.value.findIndex((r) => r.id === updated.id);
      if (idx !== -1) rawFlights.value[idx] = updated;
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
      const idx = rawFlights.value.findIndex((f) => f.id === updated.id);
      if (idx !== -1) rawFlights.value[idx] = updated;
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

  onMounted(() => {
    void config.ensure(); // currency/locale for money() in the passenger list
    void load();
  });

  return {
    loading,
    error,
    flights,
    routes,
    activeRoutes,
    cars,
    load,
    routeFilter,
    dateFilter,
    statusFilter,
    setRouteFilter,
    setDateFilter,
    setStatusFilter,
    highlightedDates,
    onCalendarRange,
    modalOpen: form.open,
    saving: form.saving,
    formError: form.error,
    statuses,
    form: formData,
    maxSeats,
    isEditing,
    routeOptions,
    availableCars,
    openCreate,
    openEditFromDetail,
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
    detailDirty,
    detailStatusSaving,
    detailStatusError,
    saveDetailChanges,
    detailPaymentSaving,
    detailPaymentError,
    setFlightPaid,
    money,
    remaining,
    openBookingDetail,
  };
}
