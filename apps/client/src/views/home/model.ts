import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import type { Route, Car } from '@easygo/shared';
import { api } from '@/lib/api';

/** Russian plural for "мест(о/а)". 1 место · 2-4 места · 5+ мест. */
function seatsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return 'место';
  if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return 'места';
  return 'мест';
}

/** Home screen: hero, search widget, and popular routes fetched on every visit
 *  (onIonViewWillEnter re-fires even when the tab page is already mounted). */
export function useHomeModel() {
  const router = useRouter();

  const routes = ref<Route[]>([]);
  const routesLoading = ref(false);
  const cars = ref<Car[]>([]);

  onIonViewWillEnter(async () => {
    routesLoading.value = true;
    try {
      routes.value = await api.routes.public();
    } catch {
      // Use static fallback routes from mock
    } finally {
      routesLoading.value = false;
    }
    try {
      cars.value = await api.fleet.available();
    } catch {
      cars.value = [];
    }
  });

  /** Live "free transport now" teaser: top cities by available seats, e.g.
   *  "Бишкек — 11 мест · Алматы — 6 мест". Null when the fleet is empty. */
  const fleetTeaser = computed<string | null>(() => {
    if (cars.value.length === 0) return null;
    const seatsByCity = new Map<string, number>();
    for (const c of cars.value) {
      const city = c.locationCity ?? 'Бишкек';
      seatsByCity.set(city, (seatsByCity.get(city) ?? 0) + (c.seats ?? 0));
    }
    return [...seatsByCity.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([city, seats]) => `${city} — ${seats} ${seatsWord(seats)}`)
      .join(' · ');
  });

  const staticRoutes = [
    { fromCity: 'Бишкек', toCity: 'Алматы', duration: '~4 ч · ежедневно', price: 350000 },
    { fromCity: 'Алматы', toCity: 'Бишкек', duration: '~4 ч · ежедневно', price: 350000 },
    { fromCity: 'Бишкек', toCity: 'Иссык-Куль', duration: '~5 ч · ежедневно', price: 200000 },
  ];

  return {
    router,
    routes,
    routesLoading,
    staticRoutes,
    fleetTeaser,
  };
}
