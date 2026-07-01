import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '@/stores/booking';
import { useAuthStore } from '@/stores/auth';
import { money, timeLabel } from '@/lib/format';

/** Booking form: trip summary, passenger stepper and contact details, then
 *  submit through the booking store. */
export function useBookingModel() {
  const router = useRouter();
  const store = useBookingStore();
  const auth = useAuthStore();

  const name = ref('');
  const phone = ref('');
  const whatsappSame = ref(true);
  const comment = ref('');

  // Pre-fill contact details for a logged-in customer.
  onMounted(() => {
    if (auth.client) {
      name.value = auth.client.name;
      phone.value = auth.client.phone ?? '';
    }
  });

  const nameError = ref('');
  const phoneError = ref('');

  const flight = computed(() => store.selectedFlight);

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
    let ok = true;
    if (!name.value.trim()) {
      nameError.value = 'Введите имя';
      ok = false;
    }
    if (!phone.value.trim()) {
      phoneError.value = 'Введите номер телефона';
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
    submit,
  };
}
