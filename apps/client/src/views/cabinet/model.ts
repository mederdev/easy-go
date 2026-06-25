import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Booking } from '@easygo/shared';
import { BOOKING_STATUS_LABEL, formatMoney } from '@easygo/shared';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { useAsyncResource } from '@/composables/useAsyncResource';

/** Customer cabinet: guest CTA or the logged-in profile with the upcoming /
 *  history split over the customer's bookings, plus logout. */
export function useCabinetModel() {
  const router = useRouter();
  const auth = useAuthStore();

  const activeTab = ref<'upcoming' | 'history'>('upcoming');

  const {
    data: bookings,
    loading,
    error,
  } = useAsyncResource<Booking[]>(async () => {
    if (!auth.isAuthenticated) return [];
    if (!auth.client) await auth.fetchMe();
    const res = await api.me.bookings({ limit: 50, offset: 0 });
    return res.items;
  }, []);

  function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '👤';
  }

  const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
    NEW: { bg: '#EEF6E6', color: '#3E7C12' },
    CONFIRMED: { bg: '#EEF6E6', color: '#3E7C12' },
    COMPLETED: { bg: '#F0F1EE', color: '#8A8F86' },
    CANCELLED: { bg: '#FBEDEA', color: '#C0492E' },
  };
  function statusStyle(s: string) {
    return STATUS_STYLE[s] ?? { bg: '#F0F1EE', color: '#8A8F86' };
  }

  function isUpcoming(b: Booking): boolean {
    const future = b.flight?.departAt ? new Date(b.flight.departAt).getTime() >= Date.now() : false;
    return future && (b.status === 'NEW' || b.status === 'CONFIRMED');
  }

  const upcoming = computed(() => bookings.value.filter(isUpcoming));
  const history = computed(() => bookings.value.filter((b) => !isUpcoming(b)));
  const shown = computed(() => (activeTab.value === 'upcoming' ? upcoming.value : history.value));

  function routeTitle(b: Booking): string {
    const r = b.flight?.route;
    return r ? `${r.fromCity} → ${r.toCity}` : b.code;
  }
  function dateLabel(b: Booking): string {
    return b.flight?.departAt
      ? new Date(b.flight.departAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
      : '';
  }
  function timeLabel(b: Booking): string {
    return b.flight?.departAt
      ? new Date(b.flight.departAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : '';
  }

  function logout(): void {
    auth.logout();
    bookings.value = [];
  }

  return {
    router,
    auth,
    activeTab,
    bookings,
    loading,
    error,
    initials,
    statusStyle,
    upcoming,
    history,
    shown,
    routeTitle,
    dateLabel,
    timeLabel,
    logout,
    BOOKING_STATUS_LABEL,
    formatMoney,
  };
}
