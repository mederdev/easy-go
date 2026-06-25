import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SystemConfig } from '@easygo/shared';
import { api } from '../lib/api.js';

export const useConfigStore = defineStore('config', () => {
  const config = ref<SystemConfig | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load(): Promise<void> {
    if (config.value) return;
    loading.value = true;
    error.value = null;
    try {
      config.value = await api.config.get();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Ошибка загрузки конфигурации';
    } finally {
      loading.value = false;
    }
  }

  return { config, loading, error, load };
});
