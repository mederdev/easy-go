import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { Booking } from '@easygo/shared';
import { BOOKING_STATUS_LABEL, formatMoney, paxLabel } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { openWhatsApp } from '@/lib/whatsapp';

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
    BOOKING_STATUS_LABEL,
    formatMoney,
    paxLabel,
  };
}
