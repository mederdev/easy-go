<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const sections = [
  { to: '/tabs/docs', icon: 'help', title: 'Как пользоваться', sub: 'Инструкции для пассажиров и водителей' },
  { to: '/tabs/about', icon: 'storefront', title: 'О компании', sub: 'Автопарк, преимущества, отзывы' },
  { to: '/tabs/contacts', icon: 'call', title: 'Контакты', sub: 'Телефон, WhatsApp, офис' },
  { to: '/tabs/drivers', icon: 'badge', title: 'Водителям', sub: 'Присоединиться к автопарку' },
  { to: '/tabs/partners', icon: 'handshake', title: 'Партнёрам', sub: 'Сотрудничество для бизнеса' },
];
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
      <div class="head">
        <h1 class="head-title">Информация</h1>
        <p class="head-sub">О сервисе и сотрудничество</p>
      </div>

      <div class="list">
        <button v-for="s in sections" :key="s.to" class="row" @click="router.push(s.to)">
          <span class="ic"><span class="ms">{{ s.icon }}</span></span>
          <span class="body">
            <span class="title">{{ s.title }}</span>
            <span class="sub">{{ s.sub }}</span>
          </span>
          <span class="ms chev">chevron_right</span>
        </button>
      </div>

      <div class="brand">
        <img src="/assets/logo-t.png" alt="EasyGo" class="brand-logo" />
        <div class="brand-text">EASY GO ТРАНСФЕР · Бишкек · Алматы · Иссык-Куль</div>
      </div>

      <div style="height: 40px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .head { padding: 20px 0 0; }
  .list { padding: 16px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .brand { padding: 8px 0 0; }
}

.head { padding: 12px 18px 0; }
.head-title { margin: 0; font: 800 24px 'Manrope', sans-serif; letter-spacing: -0.01em; color: var(--eg-ink); }
.head-sub { margin: 6px 0 0; font: 500 13px 'Manrope', sans-serif; color: var(--eg-muted); }
.list { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.row {
  display: flex; align-items: center; gap: 13px; width: 100%; text-align: left;
  background: #fff; border: 1px solid #eceee9; border-radius: 14px; padding: 14px 16px; cursor: pointer;
}
.ic {
  width: 42px; height: 42px; border-radius: 12px; background: var(--eg-green-light);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ic .ms { color: var(--eg-green); font-size: 21px; }
.body { flex: 1; display: flex; flex-direction: column; }
.title { font: 700 15px 'Manrope', sans-serif; color: var(--eg-ink); }
.sub { font: 500 12px 'Manrope', sans-serif; color: var(--eg-muted-light); margin-top: 2px; }
.chev { color: #c4c8c0; font-size: 20px; flex-shrink: 0; }
.brand { padding: 8px 18px 0; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.brand-logo { width: 124px; height: auto; opacity: 0.9; }
.brand-text { font: 500 12px 'Manrope', sans-serif; color: var(--eg-muted-light); }
</style>
