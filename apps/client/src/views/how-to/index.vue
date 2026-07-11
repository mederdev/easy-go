<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import BackButton from '@/components/BackButton.vue';

const passengers = [
  'Выберите маршрут и дату поездки на главном экране.',
  'Укажите количество мест и точку посадки.',
  'Подтвердите бронирование — мы свяжемся с вами в WhatsApp.',
  'Оплатите поездку водителю в день выезда.',
];

const drivers = [
  'Оставьте заявку в разделе «Водителям».',
  'Пройдите проверку документов и автомобиля.',
  'Получайте заказы и выполняйте рейсы по расписанию.',
];
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
      <div style="padding: 8px 0 0 8px"><BackButton /></div>
      <div class="howto-header">
        <h1 class="howto-header__title">Как пользоваться</h1>
        <p class="howto-header__sub">Инструкции для пассажиров и водителей</p>
      </div>

      <div class="howto-card">
        <div class="howto-card__head">
          <span class="howto-card__icon"><span class="ms">group</span></span>
          <span class="howto-card__title">Пассажирам</span>
        </div>
        <ol class="howto-steps">
          <li v-for="(step, i) in passengers" :key="i" class="howto-step">
            <span class="howto-step__num">{{ i + 1 }}</span>
            <span class="howto-step__text">{{ step }}</span>
          </li>
        </ol>
      </div>

      <div class="howto-card">
        <div class="howto-card__head">
          <span class="howto-card__icon"><span class="ms">directions_car</span></span>
          <span class="howto-card__title">Водителям</span>
        </div>
        <ol class="howto-steps">
          <li v-for="(step, i) in drivers" :key="i" class="howto-step">
            <span class="howto-step__num">{{ i + 1 }}</span>
            <span class="howto-step__text">{{ step }}</span>
          </li>
        </ol>
      </div>

      <div style="height: 32px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .howto-header { padding: 12px 0 0; }
  .howto-card { margin: 12px 0 0; }
}

.howto-header {
  padding: 12px 18px 0;
}

.howto-header__title {
  margin: 0;
  font: 800 23px 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}

.howto-header__sub {
  margin: 6px 0 0;
  font: 500 13px/1.5 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.howto-card {
  margin: 12px 16px 0;
  background: #fff;
  border: 1px solid #eceee9;
  border-radius: 16px;
  padding: 16px 18px;
}

.howto-card__head {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 12px;
}

.howto-card__icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--eg-green-light);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.howto-card__icon .ms {
  color: var(--eg-green);
  font-size: 20px;
}

.howto-card__title {
  font: 800 16px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.howto-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.howto-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.howto-step__num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--eg-green);
  color: #fff;
  font: 700 12px 'Manrope', sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
}

.howto-step__text {
  font: 500 14px/1.45 'Manrope', sans-serif;
  color: var(--eg-ink);
  padding-top: 2px;
}
</style>
