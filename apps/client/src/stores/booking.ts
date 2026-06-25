import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FlightView, Booking, CreateBookingInput } from '@easygo/shared';
import { api } from '../lib/api.js';
import { ApiError } from '@easygo/api-client';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useBookingStore = defineStore('booking', () => {
  // Search state
  const fromCity = ref('Бишкек');
  const toCity = ref('Алматы');
  const date = ref(todayISO());
  const pax = ref(2);

  // Selected flight for booking
  const selectedFlight = ref<FlightView | null>(null);

  // Submission state
  const submitting = ref(false);
  const submitError = ref<string | null>(null);
  const lastBooking = ref<Booking | null>(null);

  const routeTitle = computed(() => `${fromCity.value} → ${toCity.value}`);

  function swapCities(): void {
    const tmp = fromCity.value;
    fromCity.value = toCity.value;
    toCity.value = tmp;
  }

  function setPax(n: number): void {
    pax.value = Math.max(1, Math.min(20, n));
  }

  function setFlight(flight: FlightView): void {
    selectedFlight.value = flight;
  }

  function setRoute(from: string, to: string): void {
    fromCity.value = from;
    toCity.value = to;
  }

  async function submit(input: CreateBookingInput): Promise<Booking> {
    submitting.value = true;
    submitError.value = null;
    try {
      const booking = await api.bookings.create(input);
      lastBooking.value = booking;
      return booking;
    } catch (err) {
      submitError.value =
        err instanceof ApiError ? err.message : 'Произошла ошибка при отправке заявки';
      throw err;
    } finally {
      submitting.value = false;
    }
  }

  return {
    fromCity,
    toCity,
    date,
    pax,
    selectedFlight,
    submitting,
    submitError,
    lastBooking,
    routeTitle,
    swapCities,
    setPax,
    setFlight,
    setRoute,
    submit,
  };
});
