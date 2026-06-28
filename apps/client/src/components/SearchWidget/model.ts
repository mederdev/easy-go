import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Route } from '@easygo/shared';
import { CITIES } from '@easygo/shared';
import { useBookingStore } from '@/stores/booking';
import { api } from '@/lib/api';

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useSearchModel() {
  const router = useRouter();
  const store = useBookingStore();

  // Load public routes so we can derive city lists for context (not required for
  // free-text search, but keeps the store populated for other parts of the app).
  const routes = ref<Route[]>([]);

  // Dates with available seats — used to highlight IonDatetime
  const availableDateSet = ref<Set<string>>(new Set());

  async function loadAvailableDates() {
    if (!store.fromCity || !store.toCity) return;
    try {
      const dates = await api.flights.availableDates({
        fromCity: store.fromCity,
        toCity: store.toCity,
        from: isoOffset(0),
        to: isoOffset(60),
      });
      availableDateSet.value = new Set(dates);
    } catch {
      // non-critical
    }
  }

  onMounted(async () => {
    try {
      routes.value = await api.routes.public();
    } catch {
      routes.value = [];
    }
    void loadAvailableDates();
  });

  watch([() => store.fromCity, () => store.toCity], () => {
    void loadAvailableDates();
  });

  const fromCities = computed<string[]>(() => {
    const set = new Set(routes.value.map((r) => r.fromCity));
    return set.size ? [...set] : [...CITIES];
  });

  const toCities = computed<string[]>(() => {
    const set = new Set(routes.value.map((r) => r.toCity));
    return set.size ? [...set] : [...CITIES];
  });

  const minDate = computed(() => new Date().toISOString().slice(0, 10));

  const displayDate = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const formatted = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(store.date + 'T00:00:00'));
    if (store.date === today) {
      return `Сегодня, ${formatted}`;
    }
    return formatted;
  });

  function onDateChange(value: string): void {
    if (value) store.date = value;
  }

  function onCityInput(kind: 'from' | 'to', value: string): void {
    if (kind === 'from') store.setRoute(value, store.toCity);
    else store.setRoute(store.fromCity, value);
  }

  function swap() {
    store.swapCities();
  }

  function search() {
    void router.push('/results');
  }

  // IonDatetime highlighted-dates: green dot on dates with flights
  const highlightedDates = computed(() =>
    [...availableDateSet.value].map((date) => ({
      date,
      textColor: '#16181C',
      backgroundColor: '#EEF6E6',
    })),
  );

  return {
    store,
    displayDate,
    minDate,
    fromCities,
    toCities,
    highlightedDates,
    onCityInput,
    onDateChange,
    swap,
    search,
  };
}
