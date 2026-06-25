<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import BackButton from '../components/BackButton.vue';
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div style="padding: 8px 16px 0"><BackButton /></div>
      <div class="about-header">
        <h1 class="about-header__title">О компании</h1>
      </div>

      <!-- Photo placeholder -->
      <div class="about-photo">
        <span class="about-photo__label">[ ФОТО АВТОПАРКА ]</span>
      </div>

      <!-- Description -->
      <div class="about-text">
        <p>
          EasyGo — современный сервис пассажирских перевозок между городами Кыргызстана и Казахстана.
          Мы заменили звонки и переписки удобным онлайн-бронированием и собственным комфортным автопарком.
        </p>
      </div>

      <!-- Advantages -->
      <div class="about-section-title">Наши преимущества</div>
      <div class="about-advantages">
        <div class="adv-item">
          <span class="ms adv-item__icon">check_circle</span>
          <span class="adv-item__text">Свой автопарк KIA Carnival</span>
        </div>
        <div class="adv-item">
          <span class="ms adv-item__icon">check_circle</span>
          <span class="adv-item__text">Ежедневные рейсы по расписанию</span>
        </div>
        <div class="adv-item">
          <span class="ms adv-item__icon">check_circle</span>
          <span class="adv-item__text">Индивидуальные маршруты под заказ</span>
        </div>
      </div>

      <!-- Reviews -->
      <div class="about-section-title">Отзывы клиентов</div>
      <div class="about-reviews">
        <div class="review-card">
          <div class="review-card__stars">
            <span class="ms">star</span>
            <span class="ms">star</span>
            <span class="ms">star</span>
            <span class="ms">star</span>
            <span class="ms">star</span>
          </div>
          <p class="review-card__text">
            «Доехали быстро и комфортно. Водитель вежливый, машина чистая. Буду пользоваться ещё.»
          </p>
          <div class="review-card__author">Айгуль · Бишкек → Алматы</div>
        </div>
      </div>

      <!-- License note -->
      <div class="about-license">
        <span class="ms" style="color: var(--eg-green); font-size: 20px">verified_user</span>
        <div class="about-license__text">Лицензии и разрешительные документы доступны по запросу</div>
      </div>

      <div style="height: 32px"></div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.about-header {
  padding: 12px 18px 0;
}

.about-header__title {
  margin: 0;
  font: 800 24px 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}

.about-photo {
  margin: 14px 16px 0;
  height: 150px;
  border-radius: 16px;
  background: repeating-linear-gradient(
    135deg,
    #F1F3EF,
    #F1F3EF 11px,
    #E9ECE6 11px,
    #E9ECE6 22px
  );
  display: flex;
  align-items: center;
  justify-content: center;
}

.about-photo__label {
  font: 600 12px 'Courier New', monospace;
  color: #A7ACA2;
  letter-spacing: 0.05em;
}

.about-text {
  padding: 16px 18px 0;
}

.about-text p {
  margin: 0;
  font: 500 14px/1.6 'Manrope', sans-serif;
  color: #4A4F55;
}

.about-section-title {
  padding: 18px 16px 6px;
  font: 800 16px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.about-advantages {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.adv-item {
  display: flex;
  gap: 11px;
  align-items: center;
  background: var(--eg-bg-subtle);
  border-radius: 13px;
  padding: 13px 14px;
}

.adv-item__icon {
  color: var(--eg-green);
  font-size: 20px;
  flex-shrink: 0;
}

.adv-item__text {
  font: 600 14px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.about-reviews {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.review-card {
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 14px;
  padding: 14px 16px;
}

.review-card__stars {
  color: #F5A623;
  font-size: 16px;
  letter-spacing: 1px;
  display: flex;
  gap: 2px;
}

.review-card__text {
  margin: 8px 0 0;
  font: 500 13px/1.5 'Manrope', sans-serif;
  color: #4A4F55;
}

.review-card__author {
  font: 700 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-top: 8px;
}

.about-license {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 18px 16px;
  padding: 14px 16px;
  border: 1px dashed #D8DBD3;
  border-radius: 14px;
}

.about-license__text {
  font: 600 13px/1.4 'Manrope', sans-serif;
  color: var(--eg-muted);
}
</style>
