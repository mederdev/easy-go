import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { actionSheetController } from '@ionic/vue';
import type { Route } from '@easygo/shared';
import { CITIES } from '@easygo/shared';
import { useBookingStore } from '@/stores/booking';
import { api } from '@/lib/api';

/** Search widget: origin/destination pickers driven by the active routes, a
 *  date label, and the pax stepper — all backed by the booking store. */
export function useSearchModel() {
  const router = useRouter();
  const store = useBookingStore();

  // City options come from the active routes the admin created.
  const routes = ref<Route[]>([]);
  onMounted(async () => {
    try {
      routes.value = await api.routes.public();
    } catch {
      routes.value = [];
    }
  });

  const fromCities = computed<string[]>(() => {
    const set = new Set(routes.value.map((r) => r.fromCity));
    return set.size ? [...set] : [...CITIES];
  });

  /** Destinations reachable from a given origin (so a route always exists). */
  function destinationsFor(from: string): string[] {
    const dests = [...new Set(routes.value.filter((r) => r.fromCity === from).map((r) => r.toCity))];
    return dests.length ? dests : fromCities.value.filter((c) => c !== from);
  }

  const todayLabel = computed(() => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  });

  const displayDate = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (store.date === today) return `Сегодня, ${todayLabel.value}`;
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
    }).format(new Date(store.date + 'T00:00:00'));
  });

  function selectCity(kind: 'from' | 'to', city: string): void {
    if (kind === 'from') {
      const dests = destinationsFor(city);
      const to = dests.includes(store.toCity) ? store.toCity : dests[0] ?? store.toCity;
      store.setRoute(city, to);
    } else {
      store.setRoute(store.fromCity, city);
    }
  }

  async function pickCity(kind: 'from' | 'to'): Promise<void> {
    const options = kind === 'from' ? fromCities.value : destinationsFor(store.fromCity);
    const sheet = await actionSheetController.create({
      header: kind === 'from' ? 'Откуда' : 'Куда',
      buttons: [
        ...options.map((city) => ({ text: city, handler: () => selectCity(kind, city) })),
        { text: 'Отмена', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  function swap() {
    store.swapCities();
  }

  function search() {
    void router.push('/results');
  }

  return {
    store,
    displayDate,
    pickCity,
    swap,
    search,
  };
}
