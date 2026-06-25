import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { FlightView, Booking, CreateBookingInput } from '@easygo/shared';
import { api } from '../lib/api.js';
import { ApiError } from '@easygo/api-client';

const STORAGE_KEY = 'easygo_bookings';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface LocalBooking {
  id: string;
  code: string;
  routeTitle: string;
  departAt: string;
  pax: number;
  total: number;
  status: string;
  createdAt: string;
}

function loadLocalBookings(): LocalBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalBooking[];
  } catch {
    return [];
  }
}

function saveLocalBookings(bookings: LocalBooking[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
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

  // Local history (persisted in localStorage)
  const localBookings = ref<LocalBooking[]>(loadLocalBookings());

  const routeTitle = computed(() =>
    `${fromCity.value} → ${toCity.value}`
  );

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

      // Persist to local storage
      const local: LocalBooking = {
        id: booking.id,
        code: booking.code,
        routeTitle: `${fromCity.value} → ${toCity.value}`,
        departAt: selectedFlight.value?.departAt ?? new Date().toISOString(),
        pax: booking.pax,
        total: booking.total,
        status: booking.status,
        createdAt: booking.createdAt,
      };
      localBookings.value = [local, ...localBookings.value];
      saveLocalBookings(localBookings.value);

      return booking;
    } catch (err) {
      if (err instanceof ApiError) {
        submitError.value = err.message;
      } else {
        submitError.value = 'Произошла ошибка при отправке заявки';
      }
      throw err;
    } finally {
      submitting.value = false;
    }
  }

  const upcomingBookings = computed(() => {
    const now = new Date();
    return localBookings.value.filter(b => new Date(b.departAt) >= now);
  });

  const historyBookings = computed(() => {
    const now = new Date();
    return localBookings.value.filter(b => new Date(b.departAt) < now);
  });

  return {
    fromCity,
    toCity,
    date,
    pax,
    selectedFlight,
    submitting,
    submitError,
    lastBooking,
    localBookings,
    upcomingBookings,
    historyBookings,
    routeTitle,
    swapCities,
    setPax,
    setFlight,
    setRoute,
    submit,
  };
});
