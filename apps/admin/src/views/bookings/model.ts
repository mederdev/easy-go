import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AdminCreateBookingInput, ApplicationStatus, Booking, BookingAddon, BookingStatus, BookingStop, Car, CarFeature, Client, CreateFlightInput, CustomRequest, FlightView, Route, ServiceAddon, StopKind } from '@easygo/shared';
import { APPLICATION_STATUS_LABEL, BOOKING_STATUS_LABEL, CAR_FEATURE_LABEL, CAR_TYPE_LABEL, PAYMENT_STATUS_LABEL, STOP_KIND_LABEL, formatMoney, paxLabel, seatsLabel, toMajor, toMinor } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { bookingRouteLabel, dateLabel, dateTimeLabel, flightRouteLabel, initials, timeLabel } from '@/lib/format';

/** Bookings CRM: list with filters/search/pagination, detail drawer with status
 *  changes, and the operator-side create-booking modal. */
export function useBookingsModel() {
  const config = useConfigStore();
  const route = useRoute();
  const router = useRouter();

  const PAGE_SIZE = 20;

  type FilterValue = 'all' | BookingStatus;
  const filters: Array<{ value: FilterValue; label: string }> = [
    { value: 'all', label: 'Все' },
    { value: 'NEW', label: BOOKING_STATUS_LABEL.NEW },
    { value: 'CONFIRMED', label: BOOKING_STATUS_LABEL.CONFIRMED },
    { value: 'COMPLETED', label: BOOKING_STATUS_LABEL.COMPLETED },
    { value: 'CANCELLED', label: BOOKING_STATUS_LABEL.CANCELLED },
    { value: 'CANCELLED_BY_CLIENT', label: BOOKING_STATUS_LABEL.CANCELLED_BY_CLIENT },
    { value: 'CANCELLED_BY_COMPANY', label: BOOKING_STATUS_LABEL.CANCELLED_BY_COMPANY },
  ];

  const activeFilter = ref<FilterValue>('all');
  const search = ref('');
  const dateFrom = ref(''); // filter by flight departure day, ISO YYYY-MM-DD
  const dateTo = ref('');
  const offset = ref(0);

  const loading = ref(true);
  const error = ref<string | null>(null);
  const items = ref<Booking[]>([]);
  const total = ref(0);

  const selected = ref<Booking | null>(null);
  const statusBusy = ref(false);
  const statusError = ref<string | null>(null);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function money(minor: number): string {
    return formatMoney(minor, config.currency, config.locale);
  }

  const pageStart = computed(() => (total.value === 0 ? 0 : offset.value + 1));
  const pageEnd = computed(() => Math.min(offset.value + PAGE_SIZE, total.value));
  const canPrev = computed(() => offset.value > 0);
  const canNext = computed(() => offset.value + PAGE_SIZE < total.value);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await config.ensure();
      const res = await api.bookings.list({
        limit: PAGE_SIZE,
        offset: offset.value,
        status: activeFilter.value === 'all' ? undefined : activeFilter.value,
        search: search.value.trim() || undefined,
        from: dateFrom.value || undefined,
        to: dateTo.value || undefined,
      });
      items.value = res.items;
      total.value = res.total;
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  function setFilter(value: FilterValue): void {
    if (activeFilter.value === value) return;
    activeFilter.value = value;
    offset.value = 0;
    void load();
  }

  function setDateFrom(date: string): void {
    if (date === dateFrom.value) return;
    dateFrom.value = date;
    if (dateTo.value && dateFrom.value > dateTo.value) dateTo.value = dateFrom.value;
    offset.value = 0;
    void load();
  }

  function setDateTo(date: string): void {
    if (date === dateTo.value) return;
    dateTo.value = date;
    if (dateFrom.value && dateTo.value && dateTo.value < dateFrom.value) dateFrom.value = dateTo.value;
    offset.value = 0;
    void load();
  }

  function clearDates(): void {
    if (!dateFrom.value && !dateTo.value) return;
    dateFrom.value = '';
    dateTo.value = '';
    offset.value = 0;
    void load();
  }

  watch(search, () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      offset.value = 0;
      void load();
    }, 350);
  });

  function prev(): void {
    if (!canPrev.value) return;
    offset.value = Math.max(0, offset.value - PAGE_SIZE);
    void load();
  }
  function next(): void {
    if (!canNext.value) return;
    offset.value += PAGE_SIZE;
    void load();
  }

  // ── Edit booking (departure time / passengers / price / discount / prepayment) — admin only ──
  // The whole booking is read-only until the operator taps the pencil; `editing`
  // then reveals a form populated from the booking. `unitPrice` is null when the
  // booking follows the route price; set it to charge a custom per-seat price
  // (e.g. splitting the salon fare across fewer passengers).
  const editing = ref(false);
  const editFlights = ref<FlightView[]>([]); // flights the booking can be moved to
  const paymentForm = reactive({
    flightId: '', // reassign the booking to another flight
    date: '', // ISO YYYY-MM-DD — the selected flight's departure day
    time: '09:00', // HH:mm — the selected flight's departure time
    pax: 1,
    unitPrice: null as number | null, // major units; null/empty = route price
    discount: 0, // major units
    prepaid: 0, // major units
    comment: '',
  });
  const paymentBusy = ref(false);
  const paymentError = ref<string | null>(null);

  /** Route per-seat price in major units — the placeholder/fallback when no override is set. */
  function routePriceMajor(b: Booking | null): number {
    return toMajor(b?.flight?.route?.price ?? 0, config.currency);
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  function toDateInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function toTimeInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const selectedEditFlight = computed(() => editFlights.value.find((f) => f.id === paymentForm.flightId) ?? null);

  /** Max passengers for the chosen flight: its free seats, plus this booking's own
   *  seats when it already sits on that flight AND already holds them (only
   *  CONFIRMED/COMPLETED bookings are counted in `seatsTaken`, so only they get
   *  their own seats added back; a NEW booking reserves nothing). */
  const maxEditPax = computed(() => {
    const f = selectedEditFlight.value;
    if (!f) return 20;
    const b = selected.value;
    const holds = b?.status === 'CONFIRMED' || b?.status === 'COMPLETED';
    const own = b && holds && f.id === b.flightId ? b.pax : 0;
    return Math.max(1, f.seatsLeft + own);
  });

  /** True when the entered passenger count exceeds the flight's available seats. */
  const paxExceedsSeats = computed(() => (Number(paymentForm.pax) || 0) > maxEditPax.value);

  function clampEditPax(): void {
    const n = Number(paymentForm.pax) || 1;
    paymentForm.pax = Math.min(Math.max(1, n), maxEditPax.value);
  }

  /** Picking a different flight snaps the date/time to it and re-clamps passengers. */
  function onEditFlightChange(): void {
    const f = selectedEditFlight.value;
    if (f) {
      paymentForm.date = toDateInput(f.departAt);
      paymentForm.time = toTimeInput(f.departAt);
    }
    clampEditPax();
  }

  function syncPaymentForm(b: Booking): void {
    paymentForm.flightId = b.flightId;
    paymentForm.date = toDateInput(b.flight?.departAt);
    paymentForm.time = toTimeInput(b.flight?.departAt) || '09:00';
    paymentForm.pax = b.pax;
    paymentForm.unitPrice = b.unitPrice != null ? toMajor(b.unitPrice, config.currency) : null;
    paymentForm.discount = toMajor(b.discount, config.currency);
    paymentForm.prepaid = toMajor(b.prepaid, config.currency);
    paymentForm.comment = b.comment ?? '';
  }

  /** A flight's departure day is before today → it's in the past. */
  function isPastFlight(iso?: string | null): boolean {
    const d = new Date(iso ?? '');
    if (Number.isNaN(d.getTime())) return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return d.getTime() < startOfToday.getTime();
  }

  /** Load the flights this booking can move to: only active ones (scheduled,
   *  upcoming, with free seats), plus its own current flight so it stays selected
   *  even if it's now full/closed. */
  async function loadEditFlights(b: Booking): Promise<void> {
    let list: FlightView[] = [];
    try {
      const scheduled = await api.flights.list({ status: 'SCHEDULED' });
      list = scheduled.filter((f) => !f.soldOut && !isPastFlight(f.departAt));
    } catch {
      list = [];
    }
    if (b.flight && !list.some((f) => f.id === b.flightId)) {
      const cf = b.flight;
      const seatsLeft = Math.max(0, cf.seatsTotal - cf.seatsTaken);
      list = [{ ...cf, seatsLeft, fewSeats: seatsLeft > 0 && seatsLeft <= 3, soldOut: seatsLeft === 0 } as FlightView, ...list];
    }
    editFlights.value = list;
  }

  async function startEdit(): Promise<void> {
    if (!selected.value) return;
    paymentError.value = null;
    editing.value = true;
    await loadEditFlights(selected.value);
    syncPaymentForm(selected.value);
  }

  function cancelEdit(): void {
    if (selected.value) syncPaymentForm(selected.value);
    paymentError.value = null;
    editing.value = false;
  }

  function applyUpdated(updated: Booking): void {
    // Preserve embedded relations the PATCH response may not include.
    const merged: Booking = { ...(selected.value ?? {} as Booking), ...updated };
    selected.value = merged;
    const idx = items.value.findIndex((x) => x.id === merged.id);
    if (idx !== -1) items.value.splice(idx, 1, merged);
  }

  async function savePayment(): Promise<void> {
    if (!selected.value) return;
    const booking = selected.value;

    // Guard: passengers can't exceed the car's available seats on the chosen flight.
    // The field-level error under the pax input explains it to the operator.
    if (paxExceedsSeats.value) return;

    paymentBusy.value = true;
    paymentError.value = null;
    try {
      const flightChanged = !!paymentForm.flightId && paymentForm.flightId !== booking.flightId;
      const targetFlightId = paymentForm.flightId || booking.flightId;

      // Departure time belongs to the flight. When it changed (against the flight
      // that will hold the booking), update it there — this shifts the whole flight
      // and every booking on it, not just this one. The booking PATCH re-reads the
      // flight afterwards, so the drawer reflects the new time.
      const targetFlight = editFlights.value.find((f) => f.id === targetFlightId);
      const desiredIso = paymentForm.date ? new Date(`${paymentForm.date}T${paymentForm.time || '00:00'}:00`).toISOString() : '';
      const currentIso = targetFlight?.departAt ? new Date(targetFlight.departAt).toISOString() : '';
      if (desiredIso && desiredIso !== currentIso) {
        await api.flights.update(targetFlightId, { departAt: desiredIso });
      }

      const rawUnit = paymentForm.unitPrice;
      const hasUnit = rawUnit !== null && String(rawUnit) !== '' && !Number.isNaN(Number(rawUnit));
      const updated = await api.bookings.setPayment(booking.id, {
        flightId: flightChanged ? targetFlightId : undefined,
        pax: Number(paymentForm.pax) || booking.pax,
        unitPrice: hasUnit ? toMinor(Number(rawUnit), config.currency) : null,
        discount: toMinor(Number(paymentForm.discount) || 0, config.currency),
        prepaid: toMinor(Number(paymentForm.prepaid) || 0, config.currency),
        comment: paymentForm.comment.trim() || null,
      });
      applyUpdated(updated);
      syncPaymentForm(selected.value ?? updated);
      editing.value = false;
    } catch (e) {
      paymentError.value = errorMessage(e);
    } finally {
      paymentBusy.value = false;
    }
  }

  // ── Pickup/dropoff points (точки сбора и развоза) ──
  // The client lists addresses; the admin edits them and confirms the price of
  // every point here. Confirmed prices are part of the booking total.
  const stopBusy = ref(false);
  const stopError = ref<string | null>(null);
  const stopFormOpen = ref(false);
  const stopForm = reactive({
    id: null as string | null, // null = adding a new point
    kind: 'PICKUP' as StopKind,
    address: '',
    note: '',
    price: null as number | null, // major units; empty = не подтверждена
  });

  const bookingStops = computed<BookingStop[]>(() => selected.value?.stops ?? []);
  // At most one point of each type (pickup / dropoff) per passenger.
  const maxStops = computed(() => selected.value?.pax ?? 0);
  const stopPickupCount = computed(() => bookingStops.value.filter((s) => s.kind === 'PICKUP').length);
  const stopDropoffCount = computed(() => bookingStops.value.filter((s) => s.kind === 'DROPOFF').length);
  const canAddStop = computed(
    () => stopPickupCount.value < maxStops.value || stopDropoffCount.value < maxStops.value,
  );

  function openStopForm(s?: BookingStop): void {
    stopForm.id = s?.id ?? null;
    // A new point defaults to whichever type still has room.
    stopForm.kind = s?.kind ?? (stopPickupCount.value < maxStops.value ? 'PICKUP' : 'DROPOFF');
    stopForm.address = s?.address ?? '';
    stopForm.note = s?.note ?? '';
    stopForm.price = s?.price != null ? toMajor(s.price, config.currency) : null;
    stopError.value = null;
    stopFormOpen.value = true;
  }

  function closeStopForm(): void {
    stopFormOpen.value = false;
    stopError.value = null;
  }

  async function saveStop(): Promise<void> {
    if (!selected.value) return;
    const address = stopForm.address.trim();
    if (!address) {
      stopError.value = 'Укажите адрес точки.';
      return;
    }
    const raw = stopForm.price;
    const hasPrice = raw !== null && String(raw) !== '' && !Number.isNaN(Number(raw));
    const price = hasPrice ? toMinor(Number(raw), config.currency) : null;
    stopBusy.value = true;
    stopError.value = null;
    try {
      const payload = { kind: stopForm.kind, address, note: stopForm.note.trim() || null, price };
      const updated = stopForm.id
        ? await api.bookings.updateStop(selected.value.id, stopForm.id, payload)
        : await api.bookings.addStop(selected.value.id, { ...payload, note: payload.note ?? undefined });
      applyUpdated(updated);
      stopFormOpen.value = false;
    } catch (e) {
      stopError.value = errorMessage(e);
    } finally {
      stopBusy.value = false;
    }
  }

  async function removeStop(s: BookingStop): Promise<void> {
    if (!selected.value) return;
    stopBusy.value = true;
    stopError.value = null;
    try {
      applyUpdated(await api.bookings.deleteStop(selected.value.id, s.id));
    } catch (e) {
      stopError.value = errorMessage(e);
    } finally {
      stopBusy.value = false;
    }
  }

  function stopPriceLabel(s: BookingStop): string {
    return s.price != null ? money(s.price) : 'не подтверждена';
  }

  /** Confirmed stop prices already included in the booking total (minor units). */
  const stopsTotalMinor = computed(() =>
    bookingStops.value.reduce((sum, s) => sum + (s.price ?? 0), 0),
  );

  // ── Доп. услуги (extra services) ──
  // A managed catalog (Settings) prefills the pick-list; each attached service's
  // price is part of the booking total.
  const addonCatalog = ref<ServiceAddon[]>([]);
  const addonBusy = ref(false);
  const addonError = ref<string | null>(null);
  const addonFormOpen = ref(false);
  const addonForm = reactive({
    id: null as string | null, // null = adding a new line
    addonId: '' as string, // catalog pick ('' = ad-hoc)
    name: '',
    price: 0, // major units
  });

  const bookingAddons = computed<BookingAddon[]>(() => selected.value?.addons ?? []);
  /** Attached service prices already included in the booking total (minor units). */
  const addonsTotalMinor = computed(() =>
    bookingAddons.value.reduce((sum, a) => sum + a.price, 0),
  );

  async function loadAddonCatalog(): Promise<void> {
    try {
      addonCatalog.value = await api.serviceAddons.list();
    } catch {
      // Non-fatal: operator can still type an ad-hoc service.
    }
  }

  function openAddonForm(a?: BookingAddon): void {
    addonForm.id = a?.id ?? null;
    addonForm.addonId = a?.addonId ?? '';
    addonForm.name = a?.name ?? '';
    addonForm.price = a ? toMajor(a.price, config.currency) : 0;
    addonError.value = null;
    addonFormOpen.value = true;
  }

  function closeAddonForm(): void {
    addonFormOpen.value = false;
    addonError.value = null;
  }

  /** Selecting a catalog service prefills its name + default price (editable). */
  function onAddonSelect(): void {
    const picked = addonCatalog.value.find((c) => c.id === addonForm.addonId);
    if (picked) {
      addonForm.name = picked.name;
      addonForm.price = toMajor(picked.price, config.currency);
    }
  }

  async function saveAddon(): Promise<void> {
    if (!selected.value) return;
    const name = addonForm.name.trim();
    if (!name) {
      addonError.value = 'Укажите услугу.';
      return;
    }
    const price = toMinor(Number(addonForm.price) || 0, config.currency);
    addonBusy.value = true;
    addonError.value = null;
    try {
      const updated = addonForm.id
        ? await api.bookings.updateAddon(selected.value.id, addonForm.id, { name, price })
        : await api.bookings.addAddon(selected.value.id, {
            addonId: addonForm.addonId || undefined,
            name,
            price,
          });
      applyUpdated(updated);
      addonFormOpen.value = false;
    } catch (e) {
      addonError.value = errorMessage(e);
    } finally {
      addonBusy.value = false;
    }
  }

  async function removeAddon(a: BookingAddon): Promise<void> {
    if (!selected.value) return;
    addonBusy.value = true;
    addonError.value = null;
    try {
      applyUpdated(await api.bookings.deleteAddon(selected.value.id, a.id));
    } catch (e) {
      addonError.value = errorMessage(e);
    } finally {
      addonBusy.value = false;
    }
  }

  function addonPriceLabel(a: BookingAddon): string {
    return money(a.price);
  }

  async function setPaid(paid: boolean): Promise<void> {
    if (!selected.value) return;
    paymentBusy.value = true;
    paymentError.value = null;
    try {
      const updated = await api.bookings.setPaymentStatus(selected.value.id, { status: paid ? 'PAID' : 'UNPAID' });
      applyUpdated(updated);
      syncPaymentForm(updated);
    } catch (e) {
      paymentError.value = errorMessage(e);
    } finally {
      paymentBusy.value = false;
    }
  }

  function open(b: Booking): void {
    selected.value = b;
    statusError.value = null;
    paymentError.value = null;
    editing.value = false;
    stopFormOpen.value = false;
    stopError.value = null;
    addonFormOpen.value = false;
    addonError.value = null;
    syncPaymentForm(b);
  }
  function closeDrawer(): void {
    selected.value = null;
    // Drop the deep-link param so a refresh/back doesn't reopen the drawer.
    if (route.query.open) void router.replace({ query: { ...route.query, open: undefined } });
  }

  /** Deep-link entry: fetch a booking by id (e.g. from the flight modal) and open it. */
  async function openById(id: string): Promise<void> {
    try {
      const booking = items.value.find((b) => b.id === id) ?? (await api.bookings.get(id));
      open(booking);
    } catch (e) {
      error.value = errorMessage(e);
    }
  }

  const nextStatuses: Record<BookingStatus, BookingStatus[]> = {
    NEW: ['CONFIRMED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY'],
    CONFIRMED: ['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_COMPANY'],
    COMPLETED: [],
    CANCELLED: ['NEW'],
    CANCELLED_BY_CLIENT: ['NEW'],
    CANCELLED_BY_COMPANY: ['NEW'],
  };

  // Status transitions available for the open booking. A booking is only
  // completed as a consequence of its flight completing, so hide COMPLETED
  // until the flight itself is finished (the API enforces the same rule).
  const availableStatuses = computed<BookingStatus[]>(() => {
    const b = selected.value;
    if (!b) return [];
    const next = nextStatuses[b.status];
    if (b.flight?.status !== 'COMPLETED') return next.filter((s) => s !== 'COMPLETED');
    return next;
  });

  async function changeStatus(status: BookingStatus): Promise<void> {
    if (!selected.value) return;
    statusBusy.value = true;
    statusError.value = null;
    try {
      const updated = await api.bookings.setStatus(selected.value.id, { status });
      // Preserve embedded relations the PATCH response may not include.
      const merged: Booking = { ...selected.value, ...updated };
      selected.value = merged;
      const idx = items.value.findIndex((x) => x.id === merged.id);
      if (idx !== -1) items.value.splice(idx, 1, merged);
    } catch (e) {
      statusError.value = errorMessage(e);
    } finally {
      statusBusy.value = false;
    }
  }

  function waLink(b: Booking): string {
    const phone = b.client?.phone?.replace(/[^\d]/g, '') ?? '';
    return `https://wa.me/${phone}`;
  }

  // ── Client search (for create booking form) ──
  const clientSearch = ref('');
  const clientSuggestions = ref<Client[]>([]);
  const clientSearching = ref(false);
  const clientSearchOpen = ref(false);
  const selectedClient = ref<Client | null>(null);

  let clientSearchTimer: ReturnType<typeof setTimeout> | undefined;

  function onClientSearchInput(): void {
    if (clientSearchTimer) clearTimeout(clientSearchTimer);
    if (!clientSearch.value.trim()) {
      clientSuggestions.value = [];
      clientSearchOpen.value = false;
      return;
    }
    clientSearchTimer = setTimeout(async () => {
      clientSearching.value = true;
      try {
        const res = await api.clients.list({ search: clientSearch.value.trim(), limit: 6, offset: 0 });
        clientSuggestions.value = res.items;
        clientSearchOpen.value = res.items.length > 0;
      } catch {
        clientSuggestions.value = [];
      } finally {
        clientSearching.value = false;
      }
    }, 300);
  }

  function pickClientSuggestion(c: Client): void {
    selectedClient.value = c;
    createForm.name = c.name;
    createForm.phone = c.phone ?? '';
    createForm.whatsapp = c.whatsapp;
    clientSearch.value = '';
    clientSuggestions.value = [];
    clientSearchOpen.value = false;
  }

  function clearSelectedClient(): void {
    selectedClient.value = null;
    createForm.name = '';
    createForm.phone = '';
  }

  function blurClientSearch(): void {
    setTimeout(() => { clientSearchOpen.value = false; }, 150);
  }

  // ── Create booking (operator-side) ──
  const createOpen = ref(false);
  const creating = ref(false);
  const createError = ref<string | null>(null);
  const bookableFlights = ref<FlightView[]>([]);
  const createStatuses: BookingStatus[] = ['NEW', 'CONFIRMED'];

  const createForm = reactive({
    flightId: '',
    pax: 1,
    name: '',
    phone: '',
    whatsapp: true,
    comment: '',
    status: 'NEW' as BookingStatus,
    unitPrice: null as number | null, // major units; empty = use route price
    discount: 0, // major units
    prepaid: 0, // major units
  });

  const selectedFlight = computed(() => bookableFlights.value.find((f) => f.id === createForm.flightId) ?? null);
  const createUnitPlaceholder = computed(() => toMajor(selectedFlight.value?.route?.price ?? 0, config.currency));
  const createTotalMinor = computed(() => {
    const raw = createForm.unitPrice;
    const price =
      raw !== null && String(raw) !== '' && !Number.isNaN(Number(raw))
        ? toMinor(Number(raw), config.currency)
        : selectedFlight.value?.route?.price ?? 0;
    const gross = price * (Number(createForm.pax) || 0);
    const discount = toMinor(Number(createForm.discount) || 0, config.currency);
    return Math.max(0, gross - Math.min(discount, gross));
  });
  const createTotal = computed(() => money(createTotalMinor.value));

  async function openCreate(): Promise<void> {
    createError.value = null;
    createForm.flightId = '';
    createForm.pax = 1;
    createForm.name = '';
    createForm.phone = '';
    createForm.whatsapp = true;
    createForm.comment = '';
    createForm.status = 'NEW';
    createForm.unitPrice = null;
    createForm.discount = 0;
    createForm.prepaid = 0;
    clientSearch.value = '';
    clientSuggestions.value = [];
    clientSearchOpen.value = false;
    selectedClient.value = null;
    createOpen.value = true;
    try {
      const list = await api.flights.list({ status: 'SCHEDULED' });
      bookableFlights.value = list.filter((f) => !f.soldOut);
      createForm.flightId = bookableFlights.value[0]?.id ?? '';
    } catch (e) {
      createError.value = errorMessage(e);
    }
  }

  function closeCreate(): void {
    createOpen.value = false;
    if (route.query.create) void router.replace({ query: { ...route.query, create: undefined } });
  }

  function flightOptionLabel(f: FlightView): string {
    return `${flightRouteLabel(f)} · ${dateLabel(f.departAt)} ${timeLabel(f.departAt)} · ${seatsLabel(f.seatsLeft)}`;
  }

  async function submitCreate(): Promise<void> {
    createError.value = null;
    if (!createForm.flightId) {
      createError.value = 'Выберите рейс.';
      return;
    }
    if (!createForm.name.trim() || createForm.phone.trim().length < 6) {
      createError.value = 'Укажите имя и телефон клиента.';
      return;
    }
    if (selectedFlight.value && createForm.pax > selectedFlight.value.seatsLeft) {
      createError.value = `Недостаточно мест: свободно ${selectedFlight.value.seatsLeft}.`;
      return;
    }
    creating.value = true;
    try {
      const payload: AdminCreateBookingInput = {
        flightId: createForm.flightId,
        pax: Number(createForm.pax) || 1,
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        whatsapp: createForm.whatsapp,
        comment: createForm.comment.trim() || undefined,
        status: createForm.status,
        unitPrice:
          createForm.unitPrice !== null && String(createForm.unitPrice) !== '' && !Number.isNaN(Number(createForm.unitPrice))
            ? toMinor(Number(createForm.unitPrice), config.currency)
            : undefined,
        discount: toMinor(Number(createForm.discount) || 0, config.currency),
        prepaid: toMinor(Number(createForm.prepaid) || 0, config.currency),
        stops: [], // points are added in the booking drawer after creation
      };
      await api.bookings.adminCreate(payload);
      createOpen.value = false;
      offset.value = 0;
      await load();
    } catch (e) {
      createError.value = errorMessage(e);
    } finally {
      creating.value = false;
    }
  }

  // ── Custom requests tab (client-left "leave a request" entries) ──
  type MainTab = 'bookings' | 'custom';
  const tab = ref<MainTab>('bookings');

  const customItems = ref<CustomRequest[]>([]);
  const customTotal = ref(0);
  const customOffset = ref(0);
  const customLoading = ref(false);
  const customLoaded = ref(false);
  const customError = ref<string | null>(null);

  const customSelected = ref<CustomRequest | null>(null);
  const customStatusBusy = ref(false);
  const customStatusError = ref<string | null>(null);

  const customPageStart = computed(() => (customTotal.value === 0 ? 0 : customOffset.value + 1));
  const customPageEnd = computed(() => Math.min(customOffset.value + PAGE_SIZE, customTotal.value));
  const customCanPrev = computed(() => customOffset.value > 0);
  const customCanNext = computed(() => customOffset.value + PAGE_SIZE < customTotal.value);

  async function loadCustom(): Promise<void> {
    customLoading.value = true;
    customError.value = null;
    try {
      const res = await api.customRequests.list({ limit: PAGE_SIZE, offset: customOffset.value });
      customItems.value = res.items;
      customTotal.value = res.total;
      customLoaded.value = true;
    } catch (e) {
      customError.value = errorMessage(e);
    } finally {
      customLoading.value = false;
    }
  }

  function setTab(value: MainTab): void {
    if (tab.value === value) return;
    tab.value = value;
    if (value === 'custom' && !customLoaded.value) void loadCustom();
  }

  function customPrev(): void {
    if (!customCanPrev.value) return;
    customOffset.value = Math.max(0, customOffset.value - PAGE_SIZE);
    void loadCustom();
  }
  function customNext(): void {
    if (!customCanNext.value) return;
    customOffset.value += PAGE_SIZE;
    void loadCustom();
  }

  function customRouteLabel(r: CustomRequest): string {
    return `${r.fromCity} → ${r.toCity}`;
  }

  function openCustom(r: CustomRequest): void {
    customSelected.value = r;
    customStatusError.value = null;
  }
  function closeCustom(): void {
    customSelected.value = null;
  }

  function customWaLink(r: CustomRequest): string {
    return `https://wa.me/${r.phone.replace(/[^\d]/g, '')}`;
  }

  // Which statuses an operator can move a request to from its current one.
  const customNextStatuses: Record<ApplicationStatus, ApplicationStatus[]> = {
    NEW: ['REVIEWING', 'ACCEPTED', 'REJECTED'],
    REVIEWING: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: ['REJECTED'],
    REJECTED: ['NEW'],
  };

  async function changeCustomStatus(status: ApplicationStatus): Promise<void> {
    if (!customSelected.value) return;
    customStatusBusy.value = true;
    customStatusError.value = null;
    try {
      const updated = await api.customRequests.setStatus(customSelected.value.id, status);
      customSelected.value = updated;
      const idx = customItems.value.findIndex((x) => x.id === updated.id);
      if (idx !== -1) customItems.value.splice(idx, 1, updated);
    } catch (e) {
      customStatusError.value = errorMessage(e);
    } finally {
      customStatusBusy.value = false;
    }
  }

  // ── Approve a custom request: create a flight + book the client in one step ──
  // A custom request has no flight yet, so accepting one means standing up a new
  // flight (on a matching route) and immediately booking the client onto it.
  const approveOpen = ref(false);
  const approving = ref(false);
  const approveError = ref<string | null>(null);
  const approveRoutes = ref<Route[]>([]);
  const approveCars = ref<Car[]>([]);
  let approveMetaLoaded = false;

  const approveForm = reactive({
    routeId: '',
    carId: '',
    date: '',
    time: '09:00',
    seatsTotal: 11,
    name: '',
    phone: '',
    pax: 1,
    whatsapp: true,
    comment: '',
    discount: 0, // major units
    prepaid: 0, // major units
  });

  const approveRoute = computed(() => approveRoutes.value.find((r) => r.id === approveForm.routeId) ?? null);
  const approveTotalMinor = computed(() => {
    const price = approveRoute.value?.price ?? 0;
    const gross = price * (Number(approveForm.pax) || 0);
    const discount = toMinor(Number(approveForm.discount) || 0, config.currency);
    return Math.max(0, gross - Math.min(discount, gross));
  });
  const approveTotal = computed(() => money(approveTotalMinor.value));

  // Default the seat count to the chosen car's capacity.
  watch(
    () => approveForm.carId,
    (id) => {
      const car = approveCars.value.find((c) => c.id === id);
      if (car) approveForm.seatsTotal = car.seats;
    },
  );

  // Extra features the customer asked for on this individual request.
  const requestedFeatures = computed<CarFeature[]>(() => customSelected.value?.features ?? []);

  /** Requested features the given car doesn't provide. */
  function missingCarFeatures(car: Car | undefined): CarFeature[] {
    if (!car) return [];
    return requestedFeatures.value.filter((f) => !car.features.includes(f));
  }

  /** True if the car can't satisfy every requested feature (for the dropdown). */
  function carUnsuitable(car: Car): boolean {
    return missingCarFeatures(car).length > 0;
  }

  /** Requested features missing on the currently selected car (live warning). */
  const selectedCarMissingFeatures = computed(() =>
    missingCarFeatures(approveCars.value.find((c) => c.id === approveForm.carId)),
  );

  async function openApprove(): Promise<void> {
    const r = customSelected.value;
    if (!r) return;
    approveError.value = null;
    // Prefill from the request; route auto-matched by city pair when one exists.
    approveForm.date = r.date;
    approveForm.time = r.time ?? '09:00';
    approveForm.pax = r.pax;
    approveForm.name = r.clientName ?? '';
    approveForm.phone = r.phone;
    approveForm.whatsapp = true;
    approveForm.comment = r.comment ?? '';
    approveForm.carId = '';
    approveForm.seatsTotal = 11;
    approveForm.discount = 0;
    approveForm.prepaid = 0;
    approveOpen.value = true;
    try {
      if (!approveMetaLoaded) {
        const [routesList, carsList] = await Promise.all([api.routes.list(), api.fleet.list()]);
        approveRoutes.value = routesList;
        approveCars.value = carsList;
        approveMetaLoaded = true;
      }
      const match = approveRoutes.value.find(
        (x) => x.fromCity === r.fromCity && x.toCity === r.toCity && x.status === 'ACTIVE',
      );
      approveForm.routeId = match?.id ?? approveRoutes.value.find((x) => x.status === 'ACTIVE')?.id ?? '';
    } catch (e) {
      approveError.value = errorMessage(e);
    }
  }

  function closeApprove(): void {
    approveOpen.value = false;
  }

  async function submitApprove(): Promise<void> {
    if (!customSelected.value) return;
    approveError.value = null;
    if (!approveForm.routeId) {
      approveError.value = 'Выберите маршрут (в нём задана цена).';
      return;
    }
    if (!approveForm.name.trim() || approveForm.phone.trim().length < 6) {
      approveError.value = 'Укажите имя и телефон клиента.';
      return;
    }
    const depart = new Date(`${approveForm.date}T${approveForm.time}:00`);
    if (Number.isNaN(depart.getTime())) {
      approveError.value = 'Укажите корректную дату и время.';
      return;
    }
    // The customer asked for specific оснащение — the assigned car must have it all.
    const missing = selectedCarMissingFeatures.value;
    if (missing.length) {
      const car = approveCars.value.find((c) => c.id === approveForm.carId);
      approveError.value = `Автомобиль «${car?.model} · ${car?.plate}» нельзя выбрать: клиенту нужно ${missing
        .map((f) => CAR_FEATURE_LABEL[f])
        .join(', ')}, а в этой машине этого нет.`;
      return;
    }
    approving.value = true;
    try {
      const flightPayload: CreateFlightInput = {
        routeId: approveForm.routeId,
        carId: approveForm.carId || null,
        departAt: depart.toISOString(),
        seatsTotal: Number(approveForm.seatsTotal) || 11,
        status: 'SCHEDULED',
      };
      const flight = await api.flights.create(flightPayload);
      const bookingPayload: AdminCreateBookingInput = {
        flightId: flight.id,
        pax: Number(approveForm.pax) || 1,
        name: approveForm.name.trim(),
        phone: approveForm.phone.trim(),
        whatsapp: approveForm.whatsapp,
        comment: approveForm.comment.trim() || undefined,
        status: 'CONFIRMED',
        discount: toMinor(Number(approveForm.discount) || 0, config.currency),
        prepaid: toMinor(Number(approveForm.prepaid) || 0, config.currency),
        // Carry the request's pickup/dropoff points onto the booking; prices
        // are confirmed afterwards in the booking drawer.
        stops: (customSelected.value.stops ?? []).map((s) => ({
          kind: s.kind,
          address: s.address,
          note: s.note ?? undefined,
        })),
      };
      await api.bookings.adminCreate(bookingPayload);
      const updated = await api.customRequests.setStatus(customSelected.value.id, 'ACCEPTED');
      const idx = customItems.value.findIndex((x) => x.id === updated.id);
      if (idx !== -1) customItems.value.splice(idx, 1, updated);
      approveOpen.value = false;
      closeCustom();
    } catch (e) {
      approveError.value = errorMessage(e);
    } finally {
      approving.value = false;
    }
  }

  function flightRouteOptionLabel(r: Route): string {
    return `${r.fromCity} → ${r.toCity} · ${money(r.price)}/место`;
  }

  // Open the create form when the topbar CTA navigates here with ?create=1.
  watch(
    () => route.query.create,
    (v) => {
      if (v) void openCreate();
    },
    { immediate: true },
  );

  // Open a booking's drawer when deep-linked with ?open=<bookingId> (e.g. from the flight modal).
  watch(
    () => route.query.open,
    (v) => {
      if (typeof v === 'string' && v) void openById(v);
    },
    { immediate: true },
  );

  onMounted(() => {
    void load();
    void loadAddonCatalog();
  });

  return {
    // list
    filters,
    activeFilter,
    search,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    clearDates,
    loading,
    error,
    items,
    total,
    pageStart,
    pageEnd,
    canPrev,
    canNext,
    load,
    setFilter,
    prev,
    next,
    // drawer
    selected,
    statusBusy,
    statusError,
    nextStatuses,
    availableStatuses,
    open,
    closeDrawer,
    changeStatus,
    waLink,
    // payment / edit
    editing,
    startEdit,
    cancelEdit,
    editFlights,
    selectedEditFlight,
    maxEditPax,
    paxExceedsSeats,
    onEditFlightChange,
    paymentForm,
    paymentBusy,
    paymentError,
    savePayment,
    setPaid,
    routePriceMajor,
    // pickup/dropoff points
    bookingStops,
    maxStops,
    canAddStop,
    stopBusy,
    stopError,
    stopFormOpen,
    stopForm,
    openStopForm,
    closeStopForm,
    saveStop,
    removeStop,
    stopPriceLabel,
    stopsTotalMinor,
    // доп. услуги
    addonCatalog,
    bookingAddons,
    addonBusy,
    addonError,
    addonFormOpen,
    addonForm,
    openAddonForm,
    closeAddonForm,
    onAddonSelect,
    saveAddon,
    removeAddon,
    addonPriceLabel,
    addonsTotalMinor,
    // create
    createOpen,
    creating,
    createError,
    bookableFlights,
    createStatuses,
    createForm,
    createTotal,
    createUnitPlaceholder,
    openCreate,
    closeCreate,
    flightOptionLabel,
    submitCreate,
    // client search
    clientSearch,
    clientSuggestions,
    clientSearching,
    clientSearchOpen,
    selectedClient,
    onClientSearchInput,
    pickClientSuggestion,
    clearSelectedClient,
    blurClientSearch,
    // custom requests tab
    tab,
    setTab,
    customItems,
    customTotal,
    customLoading,
    customError,
    customPageStart,
    customPageEnd,
    customCanPrev,
    customCanNext,
    loadCustom,
    customPrev,
    customNext,
    customRouteLabel,
    customSelected,
    openCustom,
    closeCustom,
    customWaLink,
    customNextStatuses,
    customStatusBusy,
    customStatusError,
    changeCustomStatus,
    // approve custom request → flight + booking
    approveOpen,
    approving,
    approveError,
    approveRoutes,
    approveCars,
    approveForm,
    approveTotal,
    requestedFeatures,
    selectedCarMissingFeatures,
    carUnsuitable,
    openApprove,
    closeApprove,
    submitApprove,
    flightRouteOptionLabel,
    // formatters / labels used by the template
    money,
    bookingRouteLabel,
    dateLabel,
    dateTimeLabel,
    initials,
    paxLabel,
    featureLabel: (f: CarFeature) => CAR_FEATURE_LABEL[f],
    STOP_KIND_LABEL,
    BOOKING_STATUS_LABEL,
    PAYMENT_STATUS_LABEL,
    CAR_TYPE_LABEL,
    APPLICATION_STATUS_LABEL,
  };
}
