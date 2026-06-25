import { defineStore } from 'pinia';
import type { CurrencyCode, SystemConfig, UpdateSystemConfigInput } from '@easygo/shared';
import { api } from '@/lib/api';

interface ConfigState {
  config: SystemConfig | null;
  loaded: boolean;
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    config: null,
    loaded: false,
  }),

  getters: {
    currency: (state): CurrencyCode => state.config?.currency ?? 'KGS',
    locale: (state): string => state.config?.locale ?? 'ru-RU',
  },

  actions: {
    /** Fetch once; reuse the cached config afterwards. */
    async ensure(): Promise<void> {
      if (this.loaded) return;
      await this.refresh();
    },

    async refresh(): Promise<void> {
      this.config = await api.config.get();
      this.loaded = true;
    },

    async update(input: UpdateSystemConfigInput): Promise<void> {
      this.config = await api.config.update(input);
      this.loaded = true;
    },
  },
});
