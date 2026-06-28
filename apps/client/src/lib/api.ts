import { createApiClient } from '@easygo/api-client';

/** Customer JWT lives in localStorage; the auth store is the writer. */
export const TOKEN_KEY = 'easygo_token';
export const DRIVER_KEY = 'eg_driver_token';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const onUnauthorized = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DRIVER_KEY);
  window.dispatchEvent(new CustomEvent('easygo:unauthorized'));
};

export const api = createApiClient({
  baseUrl: BASE_URL,
  getToken: () => localStorage.getItem(TOKEN_KEY),
  onUnauthorized,
});

/** Separate client instance that sends the driver JWT for driver-* endpoints. */
export const driverApi = createApiClient({
  baseUrl: BASE_URL,
  getToken: () => localStorage.getItem(DRIVER_KEY),
  onUnauthorized,
});
