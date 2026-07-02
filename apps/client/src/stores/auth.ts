import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Client, DriverProfile } from '@easygo/shared';
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

  /** Register with phone + name + password, store the token + profile. */
  async function register(phone: string, name: string, password: string): Promise<Client> {
    const res = await api.clientAuth.register({ phone, name, password });
    setToken(res.token);
    client.value = res.client;
    return res.client;
  }

  /** Client login with phone + password. */
  async function clientLogin(phone: string, password: string): Promise<Client> {
    const res = await api.clientAuth.login({ phone, password });
    setToken(res.token);
    client.value = res.client;
    return res.client;
  }

  /** Adopt a session confirmed through the Telegram deep-link poll. */
  function setClientSession(t: string, c: Client): void {
    setToken(t);
    client.value = c;
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
    register,
    clientLogin,
    setClientSession,
    driverLogin,
    fetchMe,
    logout,
  };
});
