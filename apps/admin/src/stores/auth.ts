import { defineStore } from 'pinia';
import type { AuthUser, UserRole } from '@easygo/shared';
import { api, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '@/lib/api';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

function readUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: readToken(),
    user: readUser(),
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.token),
    role: (state): UserRole | null => state.user?.role ?? null,
    isOwner: (state): boolean => state.user?.role === 'owner',
    isAdmin: (state): boolean => state.user?.role === 'admin' || state.user?.role === 'owner',
    initials: (state): string => {
      const name = state.user?.name?.trim();
      if (!name) return 'ОП';
      const parts = name.split(/\s+/).filter(Boolean);
      const letters = parts.slice(0, 2).map((p) => p[0] ?? '');
      return letters.join('').toUpperCase() || 'ОП';
    },
  },

  actions: {
    persist(): void {
      try {
        if (this.token) localStorage.setItem(TOKEN_STORAGE_KEY, this.token);
        else localStorage.removeItem(TOKEN_STORAGE_KEY);
        if (this.user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user));
        else localStorage.removeItem(USER_STORAGE_KEY);
      } catch {
        /* ignore storage errors */
      }
    },

    async login(phone: string, password: string): Promise<void> {
      const res = await api.auth.login({ phone, password });
      this.token = res.token;
      this.user = res.user;
      this.persist();
    },

    async fetchMe(): Promise<void> {
      const me = await api.auth.me();
      this.user = me;
      this.persist();
    },

    logout(): void {
      this.token = null;
      this.user = null;
      this.persist();
    },
  },
});
