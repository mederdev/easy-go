import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { StopKind } from '@easygo/shared';
import { formatMoney } from '@easygo/shared';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { useConfigStore } from '@/stores/config';
import { money, timeLabel } from '@/lib/format';

/** Booking form: trip summary, passenger stepper and contact details, then
 *  submit through the booking store. */
export function useBookingModel() {
  const router = useRouter();
  const store = useBookingStore();
  const auth = useAuthStore();
  const config = useConfigStore();

  const name = ref('');
  const phone = ref('');
  const whatsappSame = ref(true);
  const comment = ref('');

  // ── Extra pickup/dropoff points. Each one is paid separately; the price is
  // agreed with the operator, so here the client only lists addresses.
  // At most one point of each type (pickup / dropoff) per passenger. ──
  const stops = ref<Array<{ kind: StopKind; address: string; note: string }>>([]);
  const stopsError = ref('');

  const pickupCount = computed(() => stops.value.filter((s) => s.kind === 'PICKUP').length);
  const dropoffCount = computed(() => stops.value.filter((s) => s.kind === 'DROPOFF').length);
  // Room for another point while either type is still under the passenger count.
  const canAddStop = computed(() => pickupCount.value < store.pax || dropoffCount.value < store.pax);

  function addStop(): void {
    if (!canAddStop.value) return;
    // Default the new row to whichever type still has room.
    const kind: StopKind = pickupCount.value < store.pax ? 'PICKUP' : 'DROPOFF';
    stops.value.push({ kind, address: '', note: '' });
  }
  function removeStop(index: number): void {
    stops.value.splice(index, 1);
    stopsError.value = '';
  }

  /** Guideline prices the admin configured (final price confirmed per booking). */
  const stopPriceHint = computed(() => {
    const c = config.config;
    if (!c || (!c.stopPriceCity && !c.stopPriceOutside)) return '';
    const parts: string[] = [];
    if (c.stopPriceCity) parts.push(`по городу — от ${formatMoney(c.stopPriceCity, c.currency)}`);
    if (c.stopPriceOutside) parts.push(`за городом — от ${formatMoney(c.stopPriceOutside, c.currency)}`);
    return `Ориентировочно ${parts.join(', ')}.`;
  });

  // Pre-fill contact details for a logged-in customer.
  onMounted(() => {
    void config.load();
    if (auth.client) {
      name.value = auth.client.name;
      phone.value = auth.client.phone ?? '';
    }
    // Never let the requested seats exceed what the flight still has free.
    store.setPax(Math.min(store.pax, maxPax.value));
  });

  const nameError = ref('');
  const phoneError = ref('');

  const flight = computed(() => store.selectedFlight);

  // The seat stepper can't go past the flight's remaining free seats.
  const maxPax = computed(() => Math.max(1, flight.value?.seatsLeft ?? 20));

  const routeTitle = computed(() => store.routeTitle);

  const departTime = computed(() => (flight.value ? timeLabel(flight.value.departAt) : ''));

  const departDateLabel = computed(() => {
    if (!flight.value) return '';
    const d = new Date(flight.value.departAt);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: '2-digit' });
    return isToday ? `Сегодня, ${dateStr}` : dateStr;
  });

  const unitPrice = computed(() => flight.value?.route?.price ?? 0);
  const total = computed(() => unitPrice.value * store.pax);
  const totalLabel = computed(() => money(total.value));

  function validate(): boolean {
    nameError.value = '';
    phoneError.value = '';
    stopsError.value = '';
    let ok = true;
    if (!name.value.trim()) {
      nameError.value = 'Введите имя';
      ok = false;
    }
    if (!phone.value.trim()) {
      phoneError.value = 'Введите номер телефона';
      ok = false;
    }
    // Every added point must have an address; empty rows are rejected, not dropped.
    if (stops.value.some((s) => !s.address.trim())) {
      stopsError.value = 'Укажите адрес для каждой точки или удалите пустую';
      ok = false;
    } else if (pickupCount.value > store.pax || dropoffCount.value > store.pax) {
      stopsError.value = `Точек каждого типа не может быть больше, чем пассажиров (${store.pax})`;
      ok = false;
    }
    return ok;
  }

  async function submit() {
    if (!validate()) return;
    if (!flight.value) return;

    try {
      await store.submit({
        flightId: flight.value.id,
        pax: store.pax,
        name: name.value.trim(),
        phone: phone.value.trim(),
        whatsapp: whatsappSame.value,
        comment: comment.value.trim() || undefined,
        stops: stops.value
          .filter((s) => s.address.trim())
          .map((s) => ({ kind: s.kind, address: s.address.trim(), note: s.note.trim() || undefined })),
      });
      void router.push('/confirm');
    } catch {
      // error is set in store.submitError
    }
  }

  return {
    router,
    store,
    name,
    phone,
    whatsappSame,
    comment,
    nameError,
    phoneError,
    routeTitle,
    departDateLabel,
    departTime,
    totalLabel,
    maxPax,
    submit,
    // Pickup/dropoff points
    stops,
    stopsError,
    addStop,
    removeStop,
    stopPriceHint,
    canAddStop,
  };
}
