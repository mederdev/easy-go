import { createApiClient } from '@easygo/api-client';

export const TOKEN_STORAGE_KEY = 'easygo.admin.token';
export const USER_STORAGE_KEY = 'easygo.admin.user';

/**
 * Single shared API client. The token is read directly from localStorage inside
 * the closures (not from the Pinia store) so that the client can be created at
 * module load — before Pinia is necessarily active. The auth store keeps
 * localStorage and its reactive state in sync.
 */
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  onUnauthorized: () => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      /* ignore storage errors */
    }
    // Hard redirect to login; avoids importing the router/store here.
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  },
});

/** Narrow an unknown error into a readable Russian message. */
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'Произошла ошибка. Попробуйте ещё раз.';
}
