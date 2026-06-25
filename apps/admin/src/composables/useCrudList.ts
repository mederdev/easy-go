import { ref, type Ref } from 'vue';
import { errorMessage } from '@/lib/api';

/**
 * List-loading mechanics shared by the CRUD views (Routes, Fleet, Flights, …):
 * a `loading`/`error`/`items` triplet plus a `load()` that wraps the supplied
 * fetcher in the usual try/catch → readable error message.
 *
 * The fetcher owns any per-view preconditions (e.g. `await config.ensure()`)
 * and returns the list to display.
 */
export function useCrudList<T>(fetcher: () => Promise<T[]>) {
  const loading = ref(true);
  const error = ref<string | null>(null);
  const items = ref<T[]>([]) as Ref<T[]>;

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      items.value = await fetcher();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, items, load };
}
