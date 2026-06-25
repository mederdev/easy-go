import { computed, onMounted, ref, watch } from 'vue';
import type { Client } from '@easygo/shared';
import { formatMoney } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import { dateLabel, initials } from '@/lib/format';

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
    initials,
  };
}
