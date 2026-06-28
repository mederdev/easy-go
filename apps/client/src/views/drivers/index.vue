<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import BackButton from '@/components/BackButton.vue';
import { useDriversModel } from './model';

const {
  name,
  phone,
  hasCar,
  carInfo,
  experience,
  directions,
  about,
  nameError,
  phoneError,
  submitting,
  submitError,
  sent,
  submit,
} = useDriversModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
      <div style="padding: 8px 0 0"><BackButton /></div>
      <div class="drivers-header">
        <h1 class="drivers-header__title">Водителям</h1>
        <p class="drivers-header__sub">
          Присоединяйтесь к автопарку EasyGo. Заполните заявку — мы свяжемся с вами.
        </p>
      </div>

      <!-- Success state -->
      <div v-if="sent" class="drivers-success">
        <span class="ms drivers-success__icon">task_alt</span>
        <div class="drivers-success__title">Заявка отправлена</div>
        <div class="drivers-success__sub">Спасибо! Мы рассмотрим её и свяжемся с вами.</div>
      </div>

      <!-- Form -->
      <div v-else class="drivers-form">
        <div class="field-group">
          <label class="field-label">Имя</label>
          <input
            v-model="name"
            placeholder="Ваше имя"
            class="field-input"
            :class="nameError && 'field-input--error'"
            type="text"
          />
          <div v-if="nameError" class="field-error">{{ nameError }}</div>
        </div>

        <div class="field-group">
          <label class="field-label">Телефон / WhatsApp</label>
          <input
            v-model="phone"
            placeholder="+996 700 000 000"
            class="field-input"
            :class="phoneError && 'field-input--error'"
            type="tel"
          />
          <div v-if="phoneError" class="field-error">{{ phoneError }}</div>
        </div>

        <div class="has-car-toggle">
          <button
            :class="['toggle-btn', hasCar && 'toggle-btn--active']"
            @click="hasCar = true"
          >Есть свой автомобиль</button>
          <button
            :class="['toggle-btn', !hasCar && 'toggle-btn--active']"
            @click="hasCar = false"
          >Без авто</button>
        </div>

        <div class="field-group">
          <label class="field-label">Марка и данные авто</label>
          <input
            v-model="carInfo"
            placeholder="Напр. KIA Carnival, 11 мест"
            class="field-input"
            type="text"
          />
        </div>

        <div class="field-group">
          <label class="field-label">Опыт работы</label>
          <input
            v-model="experience"
            placeholder="Напр. 5 лет"
            class="field-input"
            type="text"
          />
        </div>

        <div class="field-group">
          <label class="field-label">Города и направления</label>
          <input
            v-model="directions"
            placeholder="Напр. Бишкек — Алматы"
            class="field-input"
            type="text"
          />
        </div>

        <div class="field-group">
          <label class="field-label">
            О себе <span class="field-optional">(необязательно)</span>
          </label>
          <textarea
            v-model="about"
            placeholder="Дополнительная информация"
            class="field-textarea"
            rows="3"
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
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .drivers-header { padding: 12px 0 0; }
  .drivers-form { padding: 16px 0; }
  .drivers-success { margin: 18px 0; }
}

.drivers-header {
  padding: 12px 18px 0;
}

.drivers-header__title {
  margin: 0;
  font: 800 23px 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}

.drivers-header__sub {
  margin: 6px 0 0;
  font: 500 13px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.drivers-success {
  margin: 18px 16px;
  background: var(--eg-green-light);
  border-radius: 16px;
  padding: 22px;
  text-align: center;
}

.drivers-success__icon {
  font-size: 42px;
  color: var(--eg-green);
}

.drivers-success__title {
  font: 800 17px 'Manrope', sans-serif;
  color: var(--eg-ink);
  margin-top: 8px;
}

.drivers-success__sub {
  font: 500 13px 'Manrope', sans-serif;
  color: var(--eg-green-accent);
  margin-top: 4px;
}

.drivers-form {
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

.field-optional {
  color: #C4C8C0;
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
  height: 74px;
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

.has-car-toggle {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  flex: 1;
  height: 46px;
  border-radius: 12px;
  cursor: pointer;
  font: 700 14px 'Manrope', sans-serif;
  border: 1px solid #E2E5DF;
  background: #fff;
  color: var(--eg-muted);
  transition: all 0.15s;
}

.toggle-btn--active {
  border: 2px solid var(--eg-green);
  background: var(--eg-green-light);
  color: var(--eg-green-accent);
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
