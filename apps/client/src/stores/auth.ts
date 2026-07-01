import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Client, DriverProfile, TelegramLoginInput } from '@easygo/shared';
import { api, driverApi, TOKEN_KEY, DRIVER_KEY } from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const client = ref<Client | null>(null);
  const loading = ref(false);

  // Driver state
  const driverToken = ref<string | null>(localStorage.getItem(DRIVER_KEY));
  const driver = ref<DriverProfile | null>(null);

  const isAuthenticated = computed(() => !!token.value || !!driverToken.value);
  const isDriver = computed(() => !!driverToken.value);

  function setToken(t: string | null): void {
    token.value = t;
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function setDriverToken(t: string | null): void {
    driverToken.value = t;
    if (t) localStorage.setItem(DRIVER_KEY, t);
    else localStorage.removeItem(DRIVER_KEY);
  }

  /** Step 1 — request an OTP for a phone (dev returns the code). */
  function requestOtp(phone: string) {
    return api.clientAuth.requestOtp({ phone });
  }

  /** Step 2 — verify the code, store the token + profile. */
  async function verify(phone: string, code: string, name?: string): Promise<Client> {
    const res = await api.clientAuth.verify({ phone, code, name });
    setToken(res.token);
    client.value = res.client;
    return res.client;
  }

  /** Client login with phone + password (after password has been set). */
  async function clientLogin(phone: string, password: string): Promise<Client> {
    const res = await api.clientAuth.login({ phone, password });
    setToken(res.token);
    client.value = res.client;
    return res.client;
  }

  /** Login via the Telegram Login Widget payload (creates the client on first login). */
  async function telegramLogin(payload: TelegramLoginInput): Promise<Client> {
    const res = await api.clientAuth.telegram(payload);
    setToken(res.token);
    client.value = res.client;
    return res.client;
  }

  /** Driver login: phone + password. */
  async function driverLogin(phone: string, password: string): Promise<DriverProfile> {
    const res = await api.driverAuth.login({ phone, password });
    setDriverToken(res.token);
    driver.value = res.driver;
    return res.driver;
  }


  /** Load the profile from a stored token (on app start / cabinet open). */
  async function fetchMe(): Promise<Client | DriverProfile | null> {
    if (driverToken.value) {
      loading.value = true;
      try {
        driver.value = await driverApi.driverAuth.me();
        return driver.value;
      } catch {
        driver.value = null;
        driverToken.value = null;
        localStorage.removeItem(DRIVER_KEY);
        return null;
      } finally {
        loading.value = false;
      }
    }
    if (!token.value) return null;
    loading.value = true;
    try {
      client.value = await api.me.get();
      return client.value;
    } catch {
      client.value = null;
      token.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    setToken(null);
    setDriverToken(null);
    client.value = null;
    driver.value = null;
  }

  // Keep reactive state in sync when the api client hits a 401.
  window.addEventListener('easygo:unauthorized', () => {
    token.value = null;
    driverToken.value = null;
    client.value = null;
    driver.value = null;
  });

  return {
    token,
    client,
    loading,
    driverToken,
    driver,
    isAuthenticated,
    isDriver,
    requestOtp,
    verify,
    clientLogin,
    telegramLogin,
    driverLogin,
    fetchMe,
    logout,
  };
});
