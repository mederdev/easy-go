import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { errorMessage } from '@/lib/api';

/** Login: credentials form over the auth store, with post-login redirect. */
export function useLoginModel() {
  const auth = useAuthStore();
  const router = useRouter();
  const route = useRoute();

  const phone = ref('+996700000001');
  const password = ref('easygo123');
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function submit(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      await auth.login(phone.value.trim(), password.value);
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
      await router.push(redirect);
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  return {
    phone,
    password,
    loading,
    error,
    submit,
  };
}
