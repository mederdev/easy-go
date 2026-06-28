<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { useConfirmModel } from './model';

const {
  routeTitle,
  departTime,
  departDateLabel,
  totalLabel,
  paxCount,
  writeToWhatsApp,
  goHome,
} = useConfirmModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg pg--narrow">
      <div class="confirm-page">
        <!-- Success Icon -->
        <div class="confirm-icon">
          <span class="ms">check_circle</span>
        </div>

        <h1 class="confirm-title">Заявка отправлена!</h1>
        <p class="confirm-subtitle">
          Оператор свяжется с вами в WhatsApp, чтобы подтвердить бронирование.
        </p>

        <!-- Booking Details -->
        <div class="confirm-card">
          <div class="confirm-row">
            <span class="confirm-row__key">Маршрут</span>
            <span class="confirm-row__val">{{ routeTitle }}</span>
          </div>
          <div class="confirm-divider"></div>
          <div class="confirm-row">
            <span class="confirm-row__key">Дата и время</span>
            <span class="confirm-row__val">{{ departDateLabel }}, {{ departTime }}</span>
          </div>
          <div class="confirm-divider"></div>
          <div class="confirm-row">
            <span class="confirm-row__key">Пассажиров</span>
            <span class="confirm-row__val">{{ paxCount }}</span>
          </div>
          <div class="confirm-divider"></div>
          <div class="confirm-row confirm-row--total">
            <span class="confirm-row__total-key">Итого</span>
            <span class="confirm-row__total-val">{{ totalLabel }}</span>
          </div>
        </div>

        <!-- WhatsApp Button -->
        <button class="confirm-wa-btn" @click="writeToWhatsApp">
          <span class="ms">chat</span>
          Написать оператору в WhatsApp
        </button>

        <!-- Home Button -->
        <button class="confirm-home-btn" @click="goHome">
          На главную
        </button>
      </div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.confirm-page {
  padding: 40px 22px 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
}

.confirm-icon {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: var(--eg-green-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
  font-size: 52px;
  color: var(--eg-green);
}

.confirm-title {
  margin: 0;
  font: 800 24px 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}

.confirm-subtitle {
  margin: 10px 0 0;
  font: 500 14px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
  max-width: 280px;
}

.confirm-card {
  width: 100%;
  margin: 22px 0 0;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 16px 18px;
  text-align: left;
}

.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 7px 0;
}

.confirm-row__key {
  font: 600 13px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
}

.confirm-row__val {
  font: 700 13px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.confirm-divider {
  height: 1px;
  background: #EEF0EC;
}

.confirm-row--total {
  padding: 9px 0 2px;
}

.confirm-row__total-key {
  font: 700 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.confirm-row__total-val {
  font: 800 18px 'Manrope', sans-serif;
  color: var(--eg-green);
}

.confirm-wa-btn {
  width: 100%;
  margin-top: 18px;
  height: 54px;
  border-radius: 15px;
  border: none;
  background: var(--eg-whatsapp);
  color: #fff;
  font: 700 16px 'Manrope', sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

.confirm-wa-btn .ms {
  font-size: 22px;
}

.confirm-home-btn {
  width: 100%;
  margin-top: 10px;
  height: 50px;
  border-radius: 14px;
  border: 1px solid #E2E5DF;
  background: #fff;
  color: var(--eg-ink);
  font: 700 15px 'Manrope', sans-serif;
  cursor: pointer;
}
</style>
