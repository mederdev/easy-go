import { onMounted, ref, type Ref } from 'vue';

/**
 * Fetch-on-mount mechanics shared by the read-only pages (Results, Cabinet,
 * TripDetail, Availability, …): a `data`/`loading`/`error` triplet plus a
 * `reload()` that wraps the fetcher in the usual try/catch → readable message.
 *
 * Pass `immediate: false` to skip the on-mount fetch (e.g. when the page needs
 * to wait for a route param first and calls `reload()` itself).
 */
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  initial: T,
  options: { immediate?: boolean } = {},
) {
  const data = ref(initial) as Ref<T>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetcher();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Ошибка загрузки';
    } finally {
      loading.value = false;
    }
  }

  if (options.immediate !== false) {
    onMounted(reload);
  }

  return { data, loading, error, reload };
}
