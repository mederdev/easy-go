import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { actionSheetController } from '@ionic/vue';
import type { Car, CarFeature, Route } from '@easygo/shared';
import { CAR_TYPE_LABEL, CAR_FEATURE_LABEL, CITIES } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useBookingStore } from '@/stores/booking';

/** Free-fleet overview grouped by city, with a CTA presetting the route and
 *  jumping to search. Falls back to the static mock when the fleet is empty. */
export function useAvailabilityModel() {
  const router = useRouter();
  const booking = useBookingStore();

  const cars = ref<Car[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Public routes — used to offer real destinations from a given origin city.
  const routes = ref<Route[]>([]);

  /** Destinations actually served from `city`; all other cities as a fallback. */
  function destinationsFrom(city: string): string[] {
    const served = [...new Set(
      routes.value.filter((r) => r.fromCity === city && r.toCity !== city).map((r) => r.toCity),
    )];
    return served.length ? served : CITIES.filter((c) => c !== city);
  }

  function goSearch(from: string, to: string): void {
    booking.setRoute(from, to);
    void router.push('/results');
  }

  // "Другой город…" — destination search with live city suggestions (CityInput),
  // for cities not (yet) covered by published routes. Search still works — and
  // if no flight exists, the results screen offers the individual-request form
  // for exactly this route.
  const otherOpen = ref(false);
  const otherFrom = ref('');
  const otherTo = ref('');

  function openOther(from: string): void {
    otherFrom.value = from;
    otherTo.value = '';
    otherOpen.value = true;
  }

  function closeOther(): void {
    otherOpen.value = false;
  }

  function confirmOther(): void {
    const to = otherTo.value.trim();
    if (!to) return;
    otherOpen.value = false;
    goSearch(otherFrom.value, to);
  }

  /** Tap a city → ask where to go, then jump straight to search results.
   *  Known destinations come first; any other city goes through city search. */
  async function rideFrom(city: string): Promise<void> {
    const destinations = destinationsFrom(city);
    const sheet = await actionSheetController.create({
      header: `Куда поедем из «${city}»?`,
      buttons: [
        ...destinations.map((to) => ({ text: to, handler: () => goSearch(city, to) })),
        { text: 'Другой город…', handler: () => openOther(city) },
        { text: 'Отмена', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** "Минивэн · комфорт"-style line derived from the car type. */
  function typeLabel(car: Car): string {
    return `${CAR_TYPE_LABEL[car.type]} · комфорт`;
  }

  function featureLabels(car: Car): string[] {
    return car.features.map((f: CarFeature) => CAR_FEATURE_LABEL[f]);
  }

  onMounted(async () => {
    loading.value = true;
    // Routes are non-critical: without them the picker falls back to CITIES.
    void api.routes.public().then(
      (r) => { routes.value = r; },
      () => { routes.value = []; },
    );
    try {
      cars.value = await api.fleet.available();
    } catch (err) {
      if (err instanceof ApiError) {
        error.value = err.message;
      } else {
        error.value = 'Не удалось загрузить данные о транспорте';
      }
    } finally {
      loading.value = false;
    }
  });

  // Group cars by city
  function carsByCity(cityName: string): Car[] {
    return cars.value.filter(c => c.locationCity === cityName || (!c.locationCity && cityName === 'Бишкек'));
  }

  const cities = ['Бишкек', 'Алматы'];

  return {
    cars,
    loading,
    error,
    rideFrom,
    carsByCity,
    cities,
    typeLabel,
    featureLabels,
    otherOpen,
    otherFrom,
    otherTo,
    closeOther,
    confirmOther,
  };
}
