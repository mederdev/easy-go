import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { Booking, BookingStop, PaymentStatus, StopKind } from '@easygo/shared';
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL, STOP_KIND_LABEL, formatMoney, paxLabel } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { openWhatsApp, callPhone } from '@/lib/whatsapp';

/** Single booking detail loaded by `:id`: status, trip details, operator
 *  WhatsApp contact and an inline cancel-with-confirmation flow. */
export function useTripDetailModel() {
  const router = useRouter();
  const route = useRoute();
  const config = useConfigStore();

  const id = route.params.id as string;
  const booking = ref<Booking | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const confirming = ref(false);
  const cancelling = ref(false);
  const cancelError = ref<string | null>(null);

  const cancellable = computed(() => {
    const b = booking.value;
    if (!b) return false;
    const future = b.flight?.departAt ? new Date(b.flight.departAt).getTime() > Date.now() : false;
    return future && (b.status === 'NEW' || b.status === 'CONFIRMED');
  });

  function dateLabel(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—';
  }
  function timeLabel(iso?: string): string {
    return iso ? new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
  }

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      booking.value = await api.me.booking(id);
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Не удалось загрузить поездку';
    } finally {
      loading.value = false;
    }
  }

  async function doCancel(): Promise<void> {
    cancelling.value = true;
    cancelError.value = null;
    try {
      booking.value = await api.me.cancelBooking(id);
      confirming.value = false;
    } catch (e) {
      cancelError.value = e instanceof ApiError ? e.message : 'Не удалось отменить бронь';
    } finally {
      cancelling.value = false;
    }
  }

  function contactOperator(): void {
    const phone = config.config?.whatsappPhone ?? '';
    void openWhatsApp(phone, `Здравствуйте! Вопрос по брони ${booking.value?.code ?? ''}.`);
  }

  // ── Driver contact: the assigned driver (if any) becomes reachable so the
  // passenger can call or write on WhatsApp about pickup. ──
  const driver = computed(() => booking.value?.flight?.car?.driver ?? null);

  function callDriver(): void {
    if (driver.value?.phone) callPhone(driver.value.phone);
  }
  function whatsappDriver(): void {
    if (!driver.value?.phone) return;
    void openWhatsApp(driver.value.phone, `Здравствуйте! Я по брони ${booking.value?.code ?? ''}.`);
  }

  /** Send a payment-confirmation message to the admin's WhatsApp. */
  function sendReceipt(): void {
    const phone = config.config?.whatsappPhone ?? '';
    const b = booking.value;
    const sum = b ? formatMoney(b.total) : '';
    void openWhatsApp(
      phone,
      `Здравствуйте! Отправляю чек об оплате по брони ${b?.code ?? ''} на сумму ${sum}.`,
    );
  }

  // ── Pickup/dropoff points: the client may add/edit/delete them while the
  // booking is active; per-point prices are confirmed by the admin. ──
  const stops = computed<BookingStop[]>(() => booking.value?.stops ?? []);

  /** Same window as cancellation: active booking before departure. */
  const stopsEditable = computed(() => cancellable.value);

  // At most one point of each type (pickup / dropoff) per passenger.
  const pax = computed(() => booking.value?.pax ?? 0);
  const pickupCount = computed(() => stops.value.filter((s) => s.kind === 'PICKUP').length);
  const dropoffCount = computed(() => stops.value.filter((s) => s.kind === 'DROPOFF').length);
  const canAddStop = computed(
    () => stopsEditable.value && (pickupCount.value < pax.value || dropoffCount.value < pax.value),
  );

  const stopFormOpen = ref(false);
  const stopBusy = ref(false);
  const stopError = ref<string | null>(null);
  const stopForm = reactive({
    id: null as string | null, // null = adding a new point
    kind: 'PICKUP' as StopKind,
    address: '',
    note: '',
  });

  function openAddStop(): void {
    stopForm.id = null;
    // Default to whichever type still has room.
    stopForm.kind = pickupCount.value < pax.value ? 'PICKUP' : 'DROPOFF';
    stopForm.address = '';
    stopForm.note = '';
    stopError.value = null;
    stopFormOpen.value = true;
  }

  function openEditStop(s: BookingStop): void {
    stopForm.id = s.id;
    stopForm.kind = s.kind;
    stopForm.address = s.address;
    stopForm.note = s.note ?? '';
    stopError.value = null;
    stopFormOpen.value = true;
  }

  function closeStopForm(): void {
    stopFormOpen.value = false;
    stopError.value = null;
  }

  async function saveStop(): Promise<void> {
    const address = stopForm.address.trim();
    if (!address) {
      stopError.value = 'Укажите адрес';
      return;
    }
    stopBusy.value = true;
    stopError.value = null;
    try {
      booking.value = stopForm.id
        ? await api.me.updateStop(id, stopForm.id, {
            kind: stopForm.kind,
            address,
            note: stopForm.note.trim() || null,
          })
        : await api.me.addStop(id, { kind: stopForm.kind, address, note: stopForm.note.trim() || undefined });
      stopFormOpen.value = false;
    } catch (e) {
      stopError.value = e instanceof ApiError ? e.message : 'Не удалось сохранить точку';
    } finally {
      stopBusy.value = false;
    }
  }

  async function removeStop(s: BookingStop): Promise<void> {
    stopBusy.value = true;
    stopError.value = null;
    try {
      booking.value = await api.me.deleteStop(id, s.id);
    } catch (e) {
      stopError.value = e instanceof ApiError ? e.message : 'Не удалось удалить точку';
    } finally {
      stopBusy.value = false;
    }
  }

  function stopPriceLabel(s: BookingStop): string {
    return s.price != null ? formatMoney(s.price) : 'цена уточняется';
  }

  const PAYMENT_STATUS_STYLE: Record<PaymentStatus, { bg: string; color: string }> = {
    UNPAID: { bg: 'rgba(192,73,46,0.2)', color: '#FF9B82' },
    PARTIAL: { bg: 'rgba(199,122,24,0.22)', color: '#F2C078' },
    PAID: { bg: 'rgba(86,169,25,0.2)', color: 'var(--eg-green-bright)' },
  };
  function paymentStatusStyle(s: PaymentStatus) {
    return PAYMENT_STATUS_STYLE[s] ?? { bg: 'rgba(255,255,255,0.16)', color: '#fff' };
  }

  onMounted(load);

  return {
    router,
    booking,
    loading,
    error,
    confirming,
    cancelling,
    cancelError,
    cancellable,
    dateLabel,
    timeLabel,
    doCancel,
    contactOperator,
    driver,
    callDriver,
    whatsappDriver,
    sendReceipt,
    paymentStatusStyle,
    BOOKING_STATUS_LABEL,
    PAYMENT_STATUS_LABEL,
    STOP_KIND_LABEL,
    formatMoney,
    paxLabel,
    // Pickup/dropoff points
    stops,
    stopsEditable,
    pax,
    canAddStop,
    stopFormOpen,
    stopForm,
    stopBusy,
    stopError,
    openAddStop,
    openEditStop,
    closeStopForm,
    saveStop,
    removeStop,
    stopPriceLabel,
  };
}
