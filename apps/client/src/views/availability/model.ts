import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Car } from '@easygo/shared';
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

  /** Tap a city → preset it as the origin and go to search. */
  function rideFrom(city: string): void {
    booking.setRoute(city, city === 'Бишкек' ? 'Алматы' : 'Бишкек');
    void router.push('/tabs/home');
  }

  onMounted(async () => {
    loading.value = true;
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
  };
}
