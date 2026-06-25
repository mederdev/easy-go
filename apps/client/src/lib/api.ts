import { createApiClient } from '@easygo/api-client';

/** Customer JWT lives in localStorage; the auth store is the writer. */
export const TOKEN_KEY = 'easygo_token';

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  getToken: () => localStorage.getItem(TOKEN_KEY),
  onUnauthorized: () => {
    localStorage.removeItem(TOKEN_KEY);
    // The auth store listens for this to clear its reactive state.
    window.dispatchEvent(new CustomEvent('easygo:unauthorized'));
  },
});
