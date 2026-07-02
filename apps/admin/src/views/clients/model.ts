import { computed, onMounted, ref, watch } from 'vue';
import type { Booking, Client } from '@easygo/shared';
import { formatMoney } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { dateLabel, dateTimeLabel, initials } from '@/lib/format';

type ClientDetail = Client & {
  bookings: Array<Booking & { flight?: { route?: { fromCity: string; toCity: string } | null; departAt: string } | null }>;
  passwordHash?: string | null;
  passwordRaw?: string | null;
};

/** Clients directory: paginated list with debounced name/phone search. */
export function useClientsModel() {
  const config = useConfigStore();

  const PAGE_SIZE = 20;

  const loading = ref(true);
  const error = ref<string | null>(null);
  const items = ref<Client[]>([]);
  const total = ref(0);
  const offset = ref(0);
  const search = ref('');

  const modalOpen = ref(false);
  const modalClient = ref<ClientDetail | null>(null);
  const modalLoading = ref(false);
  const modalError = ref<string | null>(null);

  async function selectClient(id: string): Promise<void> {
    modalOpen.value = true;
    modalClient.value = null;
    modalLoading.value = true;
    modalError.value = null;
    try {
      modalClient.value = (await api.clients.get(id)) as unknown as ClientDetail;
    } catch (e) {
      modalError.value = errorMessage(e);
    } finally {
      modalLoading.value = false;
    }
  }

  function closeModal(): void {
    modalOpen.value = false;
    pwOpen.value = false;
    pwValue.value = '';
    pwError.value = null;
    pwSuccess.value = false;
  }

  // Password form («Забыли пароль» без Telegram решается сбросом здесь)
  const pwOpen = ref(false);
  const pwValue = ref('');
  const pwSaving = ref(false);
  const pwError = ref<string | null>(null);
  const pwSuccess = ref(false);

  function openPw(): void {
    pwOpen.value = true;
    pwValue.value = '';
    pwError.value = null;
    pwSuccess.value = false;
  }

  async function savePassword(): Promise<void> {
    if (!modalClient.value || pwValue.value.length < 6 || pwSaving.value) return;
    pwSaving.value = true;
    pwError.value = null;
    pwSuccess.value = false;
    try {
      await api.clients.setPassword(modalClient.value.id, { password: pwValue.value });
      pwSuccess.value = true;
      pwOpen.value = false;
      // Re-fetch so the access chip + password reveal reflect the change.
      await selectClient(modalClient.value.id);
    } catch (e) {
      pwError.value = errorMessage(e);
    } finally {
      pwSaving.value = false;
    }
  }

  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function money(minor: number): string {
    return formatMoney(minor, config.currency, config.locale);
  }

  const pageStart = computed(() => (total.value === 0 ? 0 : offset.value + 1));
  const pageEnd = computed(() => Math.min(offset.value + PAGE_SIZE, total.value));
  const canPrev = computed(() => offset.value > 0);
  const canNext = computed(() => offset.value + PAGE_SIZE < total.value);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await config.ensure();
      const res = await api.clients.list({
        limit: PAGE_SIZE,
        offset: offset.value,
        search: search.value.trim() || undefined,
      });
      items.value = res.items;
      total.value = res.total;
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  watch(search, () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      offset.value = 0;
      void load();
    }, 350);
  });

  function prev(): void {
    if (!canPrev.value) return;
    offset.value = Math.max(0, offset.value - PAGE_SIZE);
    void load();
  }
  function next(): void {
    if (!canNext.value) return;
    offset.value += PAGE_SIZE;
    void load();
  }

  onMounted(load);

  return {
    loading,
    error,
    items,
    total,
    search,
    pageStart,
    pageEnd,
    canPrev,
    canNext,
    load,
    prev,
    next,
    money,
    dateLabel,
    dateTimeLabel,
    initials,
    modalOpen,
    modalClient,
    modalLoading,
    modalError,
    selectClient,
    closeModal,
    pwOpen,
    pwValue,
    pwSaving,
    pwError,
    pwSuccess,
    openPw,
    savePassword,
  };
}
