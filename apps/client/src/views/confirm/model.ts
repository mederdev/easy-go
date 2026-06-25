import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { formatMoney } from '@easygo/shared';
import { useBookingStore } from '@/stores/booking';
import { useConfigStore } from '@/stores/config';
import { openWhatsApp } from '@/lib/whatsapp';

/** Booking confirmation: trip summary from the store plus WhatsApp / home actions. */
export function useConfirmModel() {
  const router = useRouter();
  const store = useBookingStore();
  const configStore = useConfigStore();

  const booking = computed(() => store.lastBooking);
  const flight = computed(() => store.selectedFlight);

  const routeTitle = computed(() => store.routeTitle);

  const departTime = computed(() => {
    if (!flight.value) return '';
    return new Date(flight.value.departAt).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  });

  const departDateLabel = computed(() => {
    if (!flight.value) return '';
    const d = new Date(flight.value.departAt);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return isToday ? `Сегодня, ${dateStr}` : dateStr;
  });

  const totalLabel = computed(() => {
    if (booking.value) return formatMoney(booking.value.total);
    return '';
  });

  const paxCount = computed(() => booking.value?.pax ?? store.pax);

  async function writeToWhatsApp() {
    const phone = configStore.config?.whatsappPhone ?? '';
    const text = `Здравствуйте! Я отправил заявку на поездку ${routeTitle.value}. Код: ${booking.value?.code ?? ''}`;
    await openWhatsApp(phone, text);
  }

  function goHome() {
    void router.push('/tabs/home');
  }

  return {
    routeTitle,
    departTime,
    departDateLabel,
    totalLabel,
    paxCount,
    writeToWhatsApp,
    goHome,
  };
}
