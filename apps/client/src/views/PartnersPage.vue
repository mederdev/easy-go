<script setup lang="ts">
import { ref } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import type { CreatePartnerApplicationInput } from '@easygo/shared';
import { ApiError } from '@easygo/api-client';
import { api } from '../lib/api.js';
import ErrorBanner from '../components/ErrorBanner.vue';

const company = ref('');
const sphere = ref('');
const contacts = ref('');
const proposal = ref('');

const submitting = ref(false);
const submitError = ref<string | null>(null);
const sent = ref(false);

const companyError = ref('');
const contactsError = ref('');

function validate(): boolean {
  companyError.value = '';
  contactsError.value = '';
  let ok = true;
  if (!company.value.trim()) { companyError.value = 'Введите название компании'; ok = false; }
  if (!contacts.value.trim()) { contactsError.value = 'Введите контактные данные'; ok = false; }
  return ok;
}

async function submit() {
  if (!validate()) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const input: CreatePartnerApplicationInput = {
      company: company.value.trim(),
      sphere: sphere.value.trim() || undefined,
      contacts: contacts.value.trim(),
      proposal: proposal.value.trim() || undefined,
    };
    await api.applications.submitPartner(input);
    sent.value = true;
  } catch (err) {
    if (err instanceof ApiError) {
      submitError.value = err.message;
    } else {
      submitError.value = 'Произошла ошибка при отправке заявки';
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="partners-header">
        <h1 class="partners-header__title">Партнёрам</h1>
        <p class="partners-header__sub">
          Турагентства, отели, базы отдыха и другой бизнес — давайте сотрудничать.
        </p>
      </div>

      <!-- Success state -->
      <div v-if="sent" class="partners-success">
        <span class="ms partners-success__icon">task_alt</span>
        <div class="partners-success__title">Заявка отправлена</div>
        <div class="partners-success__sub">Мы обсудим условия сотрудничества и свяжемся с вами.</div>
      </div>

      <!-- Form -->
      <div v-else class="partners-form">
        <div class="field-group">
          <label class="field-label">Название компании</label>
          <input
            v-model="company"
            placeholder="Название"
            class="field-input"
            :class="companyError && 'field-input--error'"
            type="text"
          />
          <div v-if="companyError" class="field-error">{{ companyError }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">Сфера деятельности</label>
          <input
            v-model="sphere"
            placeholder="Напр. отель, турагентство"
            class="field-input"
            type="text"
          />
        </div>

        <div class="field-group">
          <label class="field-label">Контактные данные</label>
          <input
            v-model="contacts"
            placeholder="Телефон, email"
            class="field-input"
            :class="contactsError && 'field-input--error'"
            type="text"
          />
          <div v-if="contactsError" class="field-error">{{ contactsError }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">Предложение по сотрудничеству</label>
          <textarea
            v-model="proposal"
            placeholder="Опишите вашу компанию и формат взаимодействия"
            class="field-textarea"
            rows="4"
          ></textarea>
        </div>

        <ErrorBanner v-if="submitError" :message="submitError" style="margin: 0" />

        <button
          class="submit-btn"
          :disabled="submitting"
          @click="submit"
        >
          {{ submitting ? 'Отправка...' : 'Отправить заявку' }}
        </button>
      </div>

      <div style="height: 32px"></div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.partners-header {
  padding: 12px 18px 0;
}

.partners-header__title {
  margin: 0;
  font: 800 23px 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}

.partners-header__sub {
  margin: 6px 0 0;
  font: 500 13px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.partners-success {
  margin: 18px 16px;
  background: var(--eg-green-light);
  border-radius: 16px;
  padding: 22px;
  text-align: center;
}

.partners-success__icon {
  font-size: 42px;
  color: var(--eg-green);
}

.partners-success__title {
  font: 800 17px 'Manrope', sans-serif;
  color: var(--eg-ink);
  margin-top: 8px;
}

.partners-success__sub {
  font: 500 13px 'Manrope', sans-serif;
  color: var(--eg-green-accent);
  margin-top: 4px;
}

.partners-form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.field-group {
  display: flex;
  flex-direction: column;
}

.field-label {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-bottom: 5px;
}

.field-input {
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border: 1px solid #E2E5DF;
  border-radius: 12px;
  font: 500 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
  outline: none;
  background: #fff;
  transition: border-color 0.15s;
}

.field-input:focus {
  border-color: var(--eg-green);
}

.field-input--error {
  border-color: #C0492E;
}

.field-error {
  font: 600 11px 'Manrope', sans-serif;
  color: #C0492E;
  margin-top: 4px;
}

.field-textarea {
  width: 100%;
  height: 96px;
  padding: 12px 14px;
  border: 1px solid #E2E5DF;
  border-radius: 12px;
  font: 500 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
  outline: none;
  resize: none;
  background: #fff;
  transition: border-color 0.15s;
}

.field-textarea:focus {
  border-color: var(--eg-green);
}

.submit-btn {
  height: 54px;
  border: none;
  border-radius: 15px;
  background: var(--eg-green);
  color: #fff;
  font: 700 16px 'Manrope', sans-serif;
  cursor: pointer;
  margin-top: 4px;
  transition: opacity 0.15s;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
