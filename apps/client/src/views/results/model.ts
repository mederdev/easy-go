import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { FlightView } from '@easygo/shared';
import { paxLabel } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useBookingStore } from '@/stores/booking';

type DayKey = 'today' | 'tomorrow';

/** Flight search results: today/tomorrow day tabs over the store's route/pax,
 *  re-fetching on day change, then selecting a flight to book. */
export function useResultsModel() {
  const router = useRouter();
  const store = useBookingStore();

  const activeDay = ref<DayKey>('today');

  const flights = ref<FlightView[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function getDateISO(day: DayKey): string {
    const d = new Date();
    if (day === 'tomorrow') d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  async function loadFlights() {
    loading.value = true;
    error.value = null;
    try {
      flights.value = await api.flights.search({
        fromCity: store.fromCity,
        toCity: store.toCity,
        date: getDateISO(activeDay.value),
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

  watch(activeDay, loadFlights);
  onMounted(loadFlights);

  function choose(flight: FlightView) {
    store.setFlight(flight);
    void router.push('/booking');
  }

  const routeTitle = computed(() => `${store.fromCity} → ${store.toCity}`);
  const paxLabelVal = computed(() => paxLabel(store.pax));

  function setDay(day: DayKey) {
    activeDay.value = day;
  }

  return {
    router,
    activeDay,
    flights,
    loading,
    error,
    choose,
    routeTitle,
    paxLabelVal,
    setDay,
  };
}
