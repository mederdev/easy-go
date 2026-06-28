import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { FlightView } from '@easygo/shared';
import { paxLabel } from '@easygo/shared';
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

  const flights = ref<FlightView[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Set of ISO dates that have ≥1 available seat
  const availableDates = ref<Set<string>>(new Set());

  const stripFrom = isoDate(0);
  const stripTo = isoDate(DAYS_IN_STRIP - 1);

  async function loadAvailableDates() {
    try {
      const dates = await api.flights.availableDates({
        fromCity: store.fromCity,
        toCity: store.toCity,
        from: stripFrom,
        to: stripTo,
      });
      availableDates.value = new Set(dates);
    } catch {
      // non-critical — strip dots just won't show
    }
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
      flights.value = await api.flights.search({
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
    void loadAvailableDates();
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
  const customFormOpen = ref(false);
  const customPhone = ref(authStore.client?.phone ?? '');
  const customComment = ref('');
  const customSubmitting = ref(false);
  const customSuccess = ref(false);
  const customError = ref<string | null>(null);

  function openCustomForm() {
    customPhone.value = authStore.client?.phone ?? '';
    customComment.value = '';
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
      await api.customRequests.create({
        fromCity: store.fromCity,
        toCity: store.toCity,
        date: store.date,
        pax: store.pax,
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
    routeTitle,
    paxLabelVal,
    displayDate,
    highlightedDates,
    // custom request
    customFormOpen,
    customPhone,
    customComment,
    customSubmitting,
    customSuccess,
    customError,
    openCustomForm,
    submitCustomRequest,
    closeCustomForm,
  };
}
