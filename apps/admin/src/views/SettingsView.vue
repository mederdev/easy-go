<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { CurrencyCode, UpdateSystemConfigInput } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useConfigStore } from '@/stores/config';
import StateBlock from '@/components/StateBlock.vue';

const config = useConfigStore();

const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const saveError = ref<string | null>(null);
const saved = ref(false);

const currencies: Array<{ value: CurrencyCode; label: string }> = [
  { value: 'KGS', label: 'KGS · сом' },
  { value: 'KZT', label: 'KZT · тенге' },
  { value: 'USD', label: 'USD · доллар' },
  { value: 'RUB', label: 'RUB · рубль' },
];

const locales: Array<{ value: string; label: string }> = [
  { value: 'ru-RU', label: 'Русский (ru-RU)' },
  { value: 'kk-KZ', label: 'Қазақша (kk-KZ)' },
  { value: 'en-US', label: 'English (en-US)' },
];

const form = reactive({
  companyName: '',
  whatsappPhone: '',
  currency: 'KGS' as CurrencyCode,
  locale: 'ru-RU',
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    await config.refresh();
    if (config.config) {
      form.companyName = config.config.companyName;
      form.whatsappPhone = config.config.whatsappPhone;
      form.currency = config.config.currency;
      form.locale = config.config.locale;
    }
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  saveError.value = null;
  saved.value = false;
  if (!form.companyName.trim()) {
    saveError.value = 'Укажите название компании.';
    return;
  }
  saving.value = true;
  try {
    const payload: UpdateSystemConfigInput = {
      companyName: form.companyName.trim(),
      whatsappPhone: form.whatsappPhone.trim(),
      currency: form.currency,
      locale: form.locale,
    };
    await config.update(payload);
    saved.value = true;
    setTimeout(() => {
      saved.value = false;
    }, 2500);
  } catch (e) {
    saveError.value = errorMessage(e);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <StateBlock :loading="loading" :error="error" @retry="load">
    <div class="wrap">
      <div class="card">
        <div class="card-title">Компания</div>
        <div class="fields">
          <label class="field">
            <span class="label">Название</span>
            <input v-model="form.companyName" placeholder="EASY GO ТРАНСФЕР" />
          </label>
          <label class="field">
            <span class="label">WhatsApp для заявок</span>
            <input v-model="form.whatsappPhone" placeholder="+996 700 12 34 56" />
          </label>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Региональные параметры</div>
        <div class="fields two">
          <label class="field">
            <span class="label">Валюта</span>
            <select v-model="form.currency">
              <option v-for="c in currencies" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </label>
          <label class="field">
            <span class="label">Локаль</span>
            <select v-model="form.locale">
              <option v-for="l in locales" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>
          </label>
        </div>
      </div>

      <div class="footer">
        <div class="msgs">
          <span v-if="saveError" class="err">{{ saveError }}</span>
          <span v-else-if="saved" class="ok">Сохранено</span>
        </div>
        <button type="button" class="save" :disabled="saving" @click="save">
          {{ saving ? 'Сохранение…' : 'Сохранить' }}
        </button>
      </div>
    </div>
  </StateBlock>
</template>

<style scoped>
.wrap {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.card {
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 16px;
  padding: 20px 22px;
}
.card-title {
  font: 800 16px var(--eg-font);
  margin-bottom: 14px;
}
.fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.fields.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.label {
  font: 600 12px var(--eg-font);
  color: var(--eg-hint);
}
input,
select {
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  font: 600 14px var(--eg-font);
  outline: none;
  background: #fff;
}
input:focus,
select:focus {
  border-color: var(--eg-brand);
}
.footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}
.msgs .err {
  font: 600 13px var(--eg-font);
  color: #c0492e;
}
.msgs .ok {
  font: 700 13px var(--eg-font);
  color: var(--eg-brand-dark);
}
.save {
  height: 46px;
  padding: 0 22px;
  border: none;
  border-radius: 12px;
  background: var(--eg-brand);
  color: #fff;
  font: 700 14px var(--eg-font);
  cursor: pointer;
}
.save:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
