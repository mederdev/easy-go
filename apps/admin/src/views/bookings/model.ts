import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AdminCreateBookingInput, Booking, BookingStatus, Client, FlightView } from '@easygo/shared';
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL, formatMoney, paxLabel, seatsLabel, toMajor, toMinor } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { bookingRouteLabel, dateTimeLabel, flightRouteLabel, initials, timeLabel } from '@/lib/format';

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

  // ── Payment (discount / prepayment / status) — admin only ──
  const paymentForm = reactive({ discount: 0, prepaid: 0 }); // major units, edited in the drawer
  const paymentBusy = ref(false);
  const paymentError = ref<string | null>(null);

  function syncPaymentForm(b: Booking): void {
    paymentForm.discount = toMajor(b.discount, config.currency);
    paymentForm.prepaid = toMajor(b.prepaid, config.currency);
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
    paymentBusy.value = true;
    paymentError.value = null;
    try {
      const updated = await api.bookings.setPayment(selected.value.id, {
        discount: toMinor(Number(paymentForm.discount) || 0, config.currency),
        prepaid: toMinor(Number(paymentForm.prepaid) || 0, config.currency),
      });
      applyUpdated(updated);
      syncPaymentForm(updated);
    } catch (e) {
      paymentError.value = errorMessage(e);
    } finally {
      paymentBusy.value = false;
    }
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
    createForm.phone = c.phone;
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
    discount: 0, // major units
    prepaid: 0, // major units
  });

  const selectedFlight = computed(() => bookableFlights.value.find((f) => f.id === createForm.flightId) ?? null);
  const createTotalMinor = computed(() => {
    const price = selectedFlight.value?.route?.price ?? 0;
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
    return `${flightRouteLabel(f)} · ${timeLabel(f.departAt)} · ${seatsLabel(f.seatsLeft)}`;
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
        discount: toMinor(Number(createForm.discount) || 0, config.currency),
        prepaid: toMinor(Number(createForm.prepaid) || 0, config.currency),
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

  onMounted(load);

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
    open,
    closeDrawer,
    changeStatus,
    waLink,
    // payment
    paymentForm,
    paymentBusy,
    paymentError,
    savePayment,
    setPaid,
    // create
    createOpen,
    creating,
    createError,
    bookableFlights,
    createStatuses,
    createForm,
    createTotal,
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
    // formatters / labels used by the template
    money,
    bookingRouteLabel,
    dateTimeLabel,
    initials,
    paxLabel,
    BOOKING_STATUS_LABEL,
    PAYMENT_STATUS_LABEL,
  };
}
