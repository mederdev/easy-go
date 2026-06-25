import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { errorMessage } from '@/lib/api';

/**
 * Modal create/edit form mechanics shared by the CRUD views: the `open`/`saving`
 * flags, a form-level `error`, a `close()` that also clears the `?create=1` CTA
 * flag, and a `submit()` wrapper that handles the busy flag + try/catch.
 *
 * Call `watchCreateCta(openCreate)` after the view defines its create handler so
 * that navigating here with `?create=1` (from the topbar CTA) opens the form.
 */
export function useFormModel() {
  const route = useRoute();
  const router = useRouter();

  const open = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);

  function close(): void {
    open.value = false;
    // Clear the ?create=1 flag so re-clicking the CTA reopens the form.
    if (route.query.create) {
      void router.replace({ query: { ...route.query, create: undefined } });
    }
  }

  /**
   * Run the persistence step with the busy flag + error handling. Call only
   * after view-specific validation has passed; validation errors should be set
   * on `error` and returned before invoking this.
   */
  async function submit(run: () => Promise<void>): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      await run();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      saving.value = false;
    }
  }

  /** Open the create form whenever the topbar CTA navigates here with ?create=1. */
  function watchCreateCta(onCreate: () => void): void {
    watch(
      () => route.query.create,
      (v) => {
        if (v) onCreate();
      },
      { immediate: true },
    );
  }

  return { open, saving, error, close, submit, watchCreateCta };
}
