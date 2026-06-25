import { ref } from 'vue';
import { ApiError } from '@easygo/api-client';

/**
 * Application-form mechanics shared by the public lead forms (Drivers, Partners):
 * the `submitting`/`submitError`/`sent` flags plus a `submit()` wrapper that runs
 * the persistence step, flips `sent` on success, and surfaces a readable error.
 *
 * Call only after view-specific field validation has passed.
 */
export function useFormModel() {
  const submitting = ref(false);
  const submitError = ref<string | null>(null);
  const sent = ref(false);

  async function submit(run: () => Promise<void>): Promise<void> {
    submitting.value = true;
    submitError.value = null;
    try {
      await run();
      sent.value = true;
    } catch (err) {
      submitError.value =
        err instanceof ApiError ? err.message : 'Произошла ошибка при отправке заявки';
    } finally {
      submitting.value = false;
    }
  }

  return { submitting, submitError, sent, submit };
}
