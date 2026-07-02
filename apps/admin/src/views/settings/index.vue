<script setup lang="ts">
import StateBlock from '@/components/StateBlock.vue';
import { useSettingsModel } from './model';

const {
  loading,
  error,
  saving,
  saveError,
  saved,
  currencies,
  locales,
  form,
  load,
  save,
  tgLinked,
  tgUsername,
  tgWaiting,
  tgDeepLink,
  tgError,
  telegramLink,
  telegramDevConfirm,
  cancelLink,
  telegramUnlink,
  isDev,
} = useSettingsModel();
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

      <div class="card">
        <div class="card-title">Уведомления в Telegram</div>
        <div class="fields">
          <label class="field">
            <span class="label">ID чата для уведомлений</span>
            <input v-model="form.telegramNotifyChatId" placeholder="-1001234567890" />
          </label>
          <div class="note">
            Добавьте бота в рабочую группу — ID определится автоматически. Можно указать вручную.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Мой Telegram</div>
        <div v-if="tgWaiting" class="fields">
          <div class="note">Откройте Telegram и нажмите «Start» в чате с ботом. Ожидаем подтверждения…</div>
          <a v-if="tgDeepLink" class="tg-link" :href="tgDeepLink" target="_blank" rel="noopener">
            Открыть Telegram ещё раз
          </a>
          <div class="tg-row">
            <button v-if="isDev" type="button" class="tg-secondary" @click="telegramDevConfirm">
              Подтвердить (dev)
            </button>
            <button type="button" class="tg-secondary" @click="cancelLink">Отмена</button>
          </div>
        </div>
        <div v-else class="fields">
          <div v-if="tgLinked" class="tg-row">
            <span class="tg-status">Привязан{{ tgUsername ? `: @${tgUsername}` : '' }}</span>
            <button type="button" class="tg-secondary" @click="telegramUnlink">Отвязать</button>
          </div>
          <div v-else class="tg-row">
            <span class="note">Привяжите Telegram, чтобы входить через бота и получать уведомления о бронях.</span>
            <button type="button" class="tg-primary" @click="telegramLink">Привязать Telegram</button>
          </div>
        </div>
        <div v-if="tgError" class="tg-error">{{ tgError }}</div>
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
.note {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
}
.tg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tg-status {
  font: 700 14px var(--eg-font);
  color: var(--eg-brand-dark);
}
.tg-link {
  font: 700 13px var(--eg-font);
  color: #29a3e2;
  text-decoration: none;
}
.tg-primary {
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 11px;
  background: #29a3e2;
  color: #fff;
  font: 700 13px var(--eg-font);
  cursor: pointer;
  flex-shrink: 0;
}
.tg-secondary {
  height: 42px;
  padding: 0 16px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  background: #fff;
  color: var(--eg-hint);
  font: 700 13px var(--eg-font);
  cursor: pointer;
}
.tg-error {
  margin-top: 10px;
  background: #fbedea;
  color: #c0492e;
  font: 600 13px var(--eg-font);
  padding: 10px 14px;
  border-radius: 11px;
}

@media (max-width: 600px) {
  .fields.two {
    grid-template-columns: 1fr;
  }
}
</style>
