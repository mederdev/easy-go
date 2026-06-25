import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Client } from '@easygo/shared';
import { api, TOKEN_KEY } from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const client = ref<Client | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!token.value);

  function setToken(t: string | null): void {
    token.value = t;
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
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

  /** Load the profile from a stored token (on app start / cabinet open). */
  async function fetchMe(): Promise<Client | null> {
    if (!token.value) return null;
    loading.value = true;
    try {
      client.value = await api.me.get();
      return client.value;
    } catch {
      // 401 already cleared the token via onUnauthorized; drop local state.
      client.value = null;
      token.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  function logout(): void {
    setToken(null);
    client.value = null;
  }

  // Keep reactive state in sync when the api client hits a 401.
  window.addEventListener('easygo:unauthorized', () => {
    token.value = null;
    client.value = null;
  });

  return { token, client, loading, isAuthenticated, requestOtp, verify, fetchMe, logout };
});
