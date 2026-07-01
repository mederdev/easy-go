import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { CarType, FlightView } from '@easygo/shared';
import { paxLabel, carTypeSeats, CAR_TYPE_LABEL, CAR_TYPE_SEAT_OPTIONS } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';

const DAYS_IN_STRIP = 14;

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Flight search results. Uses store.date as the authoritative search date.
 *  The date strip shows the next 14 days; the calendar icon allows any date. */
export function useResultsModel() {
  const router = useRouter();
  const store = useBookingStore();
  const authStore = useAuthStore();

  const rawFlights = ref<FlightView[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Active (bookable) flights first, sold-out ones last; stable within each group.
  const flights = computed(() =>
    [...rawFlights.value].sort((a, b) => Number(a.soldOut) - Number(b.soldOut)),
  );

  // Set of ISO dates that have ≥1 available seat
  const availableDates = ref<Set<string>>(new Set());

  const stripFrom = isoDate(0);
  const stripTo = isoDate(DAYS_IN_STRIP - 1);

  // Ranges already fetched, so calendar month changes don't refetch needlessly
  const loadedRanges = new Set<string>();

  async function loadAvailableDates(from: string, to: string) {
    const key = `${from}_${to}`;
    if (loadedRanges.has(key)) return;
    loadedRanges.add(key);
    try {
      const dates = await api.flights.availableDates({
        fromCity: store.fromCity,
        toCity: store.toCity,
        from,
        to,
      });
      // Merge — keeps dots from previously loaded ranges (strip + other months)
      availableDates.value = new Set([...availableDates.value, ...dates]);
    } catch {
      // non-critical — dots just won't show; allow a retry later
      loadedRanges.delete(key);
    }
  }

  /** Called by the calendar when the user navigates to a month — loads its dots. */
  function onCalendarRange(range: { from: string; to: string }) {
    void loadAvailableDates(range.from, range.to);
  }

  // 14-day strip
  const dateStrip = computed(() =>
    Array.from({ length: DAYS_IN_STRIP }, (_, i) => {
      const iso = isoDate(i);
      const d = new Date(iso + 'T00:00:00');
      return {
        iso,
        day: d.getDate().toString(),
        month: new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(d),
        hasFlights: availableDates.value.has(iso),
      };
    }),
  );

  async function loadFlights() {
    loading.value = true;
    error.value = null;
    try {
      rawFlights.value = await api.flights.search({
        fromCity: store.fromCity,
        toCity: store.toCity,
        date: store.date,
        pax: store.pax,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Не удалось загрузить рейсы';
      }
    } finally {
      loading.value = false;
    }
  }

  watch(() => store.date, loadFlights);
  onMounted(() => {
    void loadAvailableDates(stripFrom, stripTo);
    void loadFlights();
  });

  function selectDate(iso: string) {
    store.date = iso;
  }

  function choose(flight: FlightView) {
    store.setFlight(flight);
    void router.push('/booking');
  }

  const routeTitle = computed(() => `${store.fromCity} → ${store.toCity}`);
  const paxLabelVal = computed(() => paxLabel(store.pax));

  const displayDate = computed(() =>
    new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
      .format(new Date(store.date + 'T00:00:00')),
  );

  const highlightedDates = computed(() =>
    [...availableDates.value].map((date) => ({
      date,
      textColor: '#16181C',
      backgroundColor: '#EEF6E6',
    })),
  );

  // ── Custom request form ──
  const carTypes: CarType[] = ['SEDAN', 'MINIVAN', 'BUS'];
  const customFormOpen = ref(false);
  const customPhone = ref(authStore.client?.phone ?? '');
  const customComment = ref('');
  const customTime = ref(''); // "HH:MM" desired departure time (empty = no preference)
  const customCarType = ref<CarType>('MINIVAN');
  const customSeats = ref<number>(CAR_TYPE_SEAT_OPTIONS.MINIVAN[0]);
  const customWholeCabin = ref(false);
  const customSubmitting = ref(false);
  const customSuccess = ref(false);
  const customError = ref<string | null>(null);

  // Seat options for the chosen class (sedan/bus have one, minivan 5/6/7).
  const carSeatOptions = computed(() => CAR_TYPE_SEAT_OPTIONS[customCarType.value]);

  /** Snap the seat count into the selected type's allowed range. */
  function selectCarType(type: CarType) {
    customCarType.value = type;
    const opts: readonly number[] = CAR_TYPE_SEAT_OPTIONS[type];
    if (!opts.includes(customSeats.value)) customSeats.value = carTypeSeats(type);
  }

  function openCustomForm() {
    customPhone.value = authStore.client?.phone ?? '';
    customComment.value = '';
    customTime.value = '';
    customCarType.value = 'MINIVAN';
    customSeats.value = CAR_TYPE_SEAT_OPTIONS.MINIVAN[0];
    customWholeCabin.value = false;
    customError.value = null;
    customSuccess.value = false;
    customFormOpen.value = true;
  }

  async function submitCustomRequest() {
    customError.value = null;
    const phone = customPhone.value.trim();
    if (!phone) {
      customError.value = 'Укажите номер телефона';
      return;
    }
    customSubmitting.value = true;
    try {
      // "Салон" books the whole car → pax is the chosen vehicle's capacity.
      const pax = customWholeCabin.value ? customSeats.value : store.pax;
      await api.customRequests.create({
        fromCity: store.fromCity,
        toCity: store.toCity,
        date: store.date,
        time: customTime.value || undefined,
        pax,
        carType: customCarType.value,
        wholeCabin: customWholeCabin.value,
        phone,
        comment: customComment.value.trim() || undefined,
      });
      customSuccess.value = true;
    } catch (err) {
      customError.value = err instanceof ApiError ? err.message : 'Не удалось отправить заявку';
    } finally {
      customSubmitting.value = false;
    }
  }

  function closeCustomForm() {
    customFormOpen.value = false;
    customSuccess.value = false;
  }

  return {
    router,
    store,
    dateStrip,
    flights,
    loading,
    error,
    choose,
    selectDate,
    onCalendarRange,
    routeTitle,
    paxLabelVal,
    displayDate,
    highlightedDates,
    // custom request
    carTypes,
    customFormOpen,
    customPhone,
    customComment,
    customTime,
    customCarType,
    customSeats,
    customWholeCabin,
    carSeatOptions,
    selectCarType,
    customSubmitting,
    customSuccess,
    customError,
    openCustomForm,
    submitCustomRequest,
    closeCustomForm,
    CAR_TYPE_LABEL,
  };
}
