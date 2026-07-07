import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import type { Booking, BookingStop, CustomRequest, DriverFlightView, PaymentStatus } from '@easygo/shared';
import { APPLICATION_STATUS_LABEL, BOOKING_STATUS_LABEL, CAR_TYPE_LABEL, FLIGHT_STATUS_LABEL, PAYMENT_STATUS_LABEL, STOP_KIND_LABEL, formatMoney } from '@easygo/shared';
import { useAuthStore } from '@/stores/auth';
import { api, driverApi } from '@/lib/api';
import { useAsyncResource } from '@/composables/useAsyncResource';
import { openWhatsApp, callPhone } from '@/lib/whatsapp';
import type { DriverFlightPassenger } from '@easygo/shared';

export function useCabinetModel() {
  const router = useRouter();
  const auth = useAuthStore();

  // ── Client bookings ──
  const activeTab = ref<'upcoming' | 'history'>('upcoming');

  const {
    data: bookings,
    loading: bookingsLoading,
    error: bookingsError,
    reload: reloadBookings,
  } = useAsyncResource<Booking[]>(async () => {
    if (!auth.isAuthenticated || auth.isDriver) return [];
    if (!auth.client) await auth.fetchMe();
    const res = await api.me.bookings({ limit: 50, offset: 0 });
    return res.items;
  }, []);

  // ── Client custom ("leave a request") orders ──
  const {
    data: customRequests,
    loading: customLoading,
    error: customError,
    reload: reloadCustom,
  } = useAsyncResource<CustomRequest[]>(async () => {
    if (!auth.isAuthenticated || auth.isDriver) return [];
    if (!auth.client) await auth.fetchMe();
    const res = await api.me.customRequests();
    return res.items;
  }, []);

  const CUSTOM_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    NEW: { bg: '#EEF6E6', color: '#3E7C12' },
    REVIEWING: { bg: '#FEF3E2', color: '#C77A18' },
    ACCEPTED: { bg: '#EEF0FF', color: '#5060C8' },
    REJECTED: { bg: '#FBEDEA', color: '#C0492E' },
  };
  function customStatusStyle(s: string) {
    return CUSTOM_STATUS_STYLE[s] ?? { bg: '#F0F1EE', color: '#8A8F86' };
  }
  function customRouteTitle(r: CustomRequest): string {
    return `${r.fromCity} → ${r.toCity}`;
  }
  function customDateLabel(r: CustomRequest): string {
    const d = new Date(r.date);
    const day = Number.isNaN(d.getTime())
      ? r.date
      : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return r.time ? `${day} · ${r.time}` : day;
  }

  // ── Driver flights ──
  const driverFlightTab = ref<'upcoming' | 'history'>('upcoming');
  const {
    data: driverFlights,
    loading: driverFlightsLoading,
    error: driverFlightsError,
    reload: reloadDriverFlights,
  } = useAsyncResource<DriverFlightView[]>(async () => {
    if (!auth.isDriver) return [];
    return driverApi.driverFlights.list();
  }, []);

  /** Re-fetch everything the cabinet shows. Called from `onIonViewWillEnter`
   *  so status changes made elsewhere (e.g. an operator confirming a booking in
   *  the CRM) surface when the user returns to the tab — the resources fetch
   *  once on mount, and a tab is kept alive, so without this the view goes
   *  stale until a full page reload. */
  async function refresh(): Promise<void> {
    await Promise.all([reloadBookings(), reloadCustom(), reloadDriverFlights()]);
  }

  // Status change
  const statusChanging = ref<string | null>(null);
  const statusChangeError = ref<string | null>(null);

  async function changeFlightStatus(flightId: string, status: 'DEPARTED' | 'COMPLETED'): Promise<void> {
    statusChanging.value = flightId;
    statusChangeError.value = null;
    try {
      await driverApi.driverFlights.setStatus(flightId, status);
      await reloadDriverFlights();
      // Keep the detail modal in sync with the freshly loaded data
      if (selectedFlight.value?.id === flightId) {
        selectedFlight.value = driverFlights.value.find((f) => f.id === flightId) ?? null;
      }
    } catch (e: unknown) {
      statusChangeError.value = (e as Error).message ?? 'Ошибка';
    } finally {
      statusChanging.value = null;
    }
  }

  // Driver flight detail modal
  const selectedFlight = ref<DriverFlightView | null>(null);

  function openFlight(f: DriverFlightView): void {
    selectedFlight.value = f;
    paymentError.value = null;
  }
  function closeFlight(): void {
    selectedFlight.value = null;
    statusChangeError.value = null;
    paymentError.value = null;
  }

  // ── Driver payment actions (status only — amounts are admin-managed) ──
  const paymentBusy = ref<string | null>(null); // bookingId | flightId being saved
  const paymentError = ref<string | null>(null);

  async function syncSelectedFlight(flightId: string): Promise<void> {
    await reloadDriverFlights();
    if (selectedFlight.value?.id === flightId) {
      selectedFlight.value = driverFlights.value.find((f) => f.id === flightId) ?? null;
    }
  }

  async function markBookingPaid(flightId: string, bookingId: string, status: PaymentStatus): Promise<void> {
    paymentBusy.value = bookingId;
    paymentError.value = null;
    try {
      await driverApi.driverFlights.setBookingPayment(flightId, bookingId, status);
      await syncSelectedFlight(flightId);
    } catch (e: unknown) {
      paymentError.value = (e as Error).message ?? 'Ошибка';
    } finally {
      paymentBusy.value = null;
    }
  }

  async function markFlightPaid(flightId: string, status: PaymentStatus): Promise<void> {
    paymentBusy.value = flightId;
    paymentError.value = null;
    try {
      await driverApi.driverFlights.setFlightPayment(flightId, status);
      await syncSelectedFlight(flightId);
    } catch (e: unknown) {
      paymentError.value = (e as Error).message ?? 'Ошибка';
    } finally {
      paymentBusy.value = null;
    }
  }

  // ── Driver: tick off "collected the passenger at this stop" ──
  const stopBusy = ref<string | null>(null); // stop id being saved

  async function toggleStopPicked(flightId: string, bookingId: string, stop: BookingStop): Promise<void> {
    stopBusy.value = stop.id;
    paymentError.value = null;
    try {
      await driverApi.driverFlights.setStopPicked(flightId, bookingId, stop.id, !stop.pickedUp);
      await syncSelectedFlight(flightId);
    } catch (e: unknown) {
      paymentError.value = (e as Error).message ?? 'Ошибка';
    } finally {
      stopBusy.value = null;
    }
  }

  // ── Driver: reach a passenger by call or WhatsApp ──
  function callPassenger(p: DriverFlightPassenger): void {
    if (p.phone) callPhone(p.phone);
  }
  function whatsappPassenger(p: DriverFlightPassenger): void {
    if (!p.phone) return;
    void openWhatsApp(p.phone, `Здравствуйте, ${p.name}! Я ваш водитель EasyGo.`);
  }

  const PAYMENT_STATUS_STYLE: Record<PaymentStatus, { bg: string; color: string }> = {
    UNPAID: { bg: '#FBEDEA', color: '#C0492E' },
    PARTIAL: { bg: '#FEF3E2', color: '#C77A18' },
    PAID: { bg: '#EEF6E6', color: '#3E7C12' },
  };
  function paymentStatusStyle(s: PaymentStatus) {
    return PAYMENT_STATUS_STYLE[s] ?? { bg: '#F0F1EE', color: '#8A8F86' };
  }

  // Shared helpers
  function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '👤';
  }

  const loading = computed(() => bookingsLoading.value || customLoading.value || driverFlightsLoading.value);
  const error = computed(() => bookingsError.value || driverFlightsError.value);

  // Client booking helpers
  const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    NEW: { bg: '#EEF6E6', color: '#3E7C12' },
    CONFIRMED: { bg: '#EEF6E6', color: '#3E7C12' },
    COMPLETED: { bg: '#F0F1EE', color: '#8A8F86' },
    CANCELLED: { bg: '#FBEDEA', color: '#C0492E' },
  };
  function statusStyle(s: string) {
    return STATUS_STYLE[s] ?? { bg: '#F0F1EE', color: '#8A8F86' };
  }

  const FLIGHT_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    SCHEDULED: { bg: '#EEF6E6', color: '#3E7C12' },
    CLOSED: { bg: '#FBEDEA', color: '#C0492E' },
    DEPARTED: { bg: '#EEF0FF', color: '#5060C8' },
    COMPLETED: { bg: '#F0F1EE', color: '#8A8F86' },
    CANCELLED: { bg: '#FBEDEA', color: '#C0492E' },
  };
  function flightStatusStyle(s: string) {
    return FLIGHT_STATUS_STYLE[s] ?? { bg: '#F0F1EE', color: '#8A8F86' };
  }

  function isUpcoming(b: Booking): boolean {
    const future = b.flight?.departAt ? new Date(b.flight.departAt).getTime() >= Date.now() : false;
    return future && (b.status === 'NEW' || b.status === 'CONFIRMED');
  }

  const upcoming = computed(() => bookings.value.filter(isUpcoming));
  const history = computed(() => bookings.value.filter((b) => !isUpcoming(b)));
  const shown = computed(() => (activeTab.value === 'upcoming' ? upcoming.value : history.value));

  function routeTitle(b: Booking): string {
    const r = b.flight?.route;
    return r ? `${r.fromCity} → ${r.toCity}` : b.code;
  }
  function dateLabel(b: Booking): string {
    return b.flight?.departAt
      ? new Date(b.flight.departAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      : '';
  }
  function timeLabel(b: Booking): string {
    return b.flight?.departAt
      ? new Date(b.flight.departAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '';
  }

  // Driver flight helpers
  function driverFlightIsUpcoming(f: DriverFlightView): boolean {
    const future = new Date(f.departAt).getTime() >= Date.now();
    return future && (f.status === 'SCHEDULED' || f.status === 'CLOSED' || f.status === 'DEPARTED');
  }

  const driverUpcoming = computed(() => driverFlights.value.filter(driverFlightIsUpcoming));
  const driverHistory = computed(() => driverFlights.value.filter((f) => !driverFlightIsUpcoming(f)));
  const driverShown = computed(() =>
    driverFlightTab.value === 'upcoming' ? driverUpcoming.value : driverHistory.value,
  );

  function driverFlightRoute(f: DriverFlightView): string {
    return `${f.route.fromCity} → ${f.route.toCity}`;
  }
  function driverFlightDate(f: DriverFlightView): string {
    return new Date(f.departAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  }
  function driverFlightTime(f: DriverFlightView): string {
    return new Date(f.departAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  /** Next allowed driver status transition, or null if none. */
  function nextStatus(f: DriverFlightView): 'DEPARTED' | 'COMPLETED' | null {
    if (f.status === 'SCHEDULED' || f.status === 'CLOSED') return 'DEPARTED';
    if (f.status === 'DEPARTED') return 'COMPLETED';
    return null;
  }

  const nextStatusLabel: Record<string, string> = {
    DEPARTED: 'Выехали — в пути',
    COMPLETED: 'Завершить рейс',
  };

  // ── Profile dropdown menu ──
  // Closed by a document-level listener instead of a fixed backdrop: on
  // desktop `.pg` is transformed (centering), which traps the dropdown's
  // z-index inside that stacking context — a sibling backdrop would paint
  // above the menu and swallow its clicks.
  const menuOpen = ref(false);
  const menuWrapEl = ref<HTMLElement | null>(null);
  function toggleMenu(): void { menuOpen.value = !menuOpen.value; }
  function closeMenu(): void { menuOpen.value = false; }

  function onDocClick(e: MouseEvent): void {
    if (!menuWrapEl.value?.contains(e.target as Node)) closeMenu();
  }
  watch(menuOpen, (open) => {
    if (open) document.addEventListener('click', onDocClick, true);
    else document.removeEventListener('click', onDocClick, true);
  });
  onBeforeUnmount(() => document.removeEventListener('click', onDocClick, true));

  function logout(): void {
    auth.logout();
    bookings.value = [];
    customRequests.value = [];
    driverFlights.value = [];
  }

  return {
    router,
    auth,
    activeTab,
    bookings,
    loading,
    error,
    refresh,
    initials,
    statusStyle,
    flightStatusStyle,
    paymentStatusStyle,
    upcoming,
    history,
    shown,
    routeTitle,
    dateLabel,
    timeLabel,
    logout,
    BOOKING_STATUS_LABEL,
    FLIGHT_STATUS_LABEL,
    PAYMENT_STATUS_LABEL,
    APPLICATION_STATUS_LABEL,
    CAR_TYPE_LABEL,
    formatMoney,
    // Custom requests
    customRequests,
    customError,
    customStatusStyle,
    customRouteTitle,
    customDateLabel,
    // Driver
    driverFlightTab,
    driverFlights,
    driverShown,
    driverUpcoming,
    driverHistory,
    statusChanging,
    statusChangeError,
    selectedFlight,
    openFlight,
    closeFlight,
    changeFlightStatus,
    driverFlightRoute,
    driverFlightDate,
    driverFlightTime,
    nextStatus,
    nextStatusLabel,
    // Driver: passenger contact
    callPassenger,
    whatsappPassenger,
    // Driver payment
    paymentBusy,
    paymentError,
    markBookingPaid,
    markFlightPaid,
    // Driver stops
    stopBusy,
    toggleStopPicked,
    STOP_KIND_LABEL,
    // Menu
    menuOpen,
    menuWrapEl,
    toggleMenu,
    closeMenu,
  };
}
