<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { useConfigStore } from '@/stores/config';
import { openWhatsApp } from '@/lib/whatsapp';
import MapView from '@/components/MapView.vue';
import BackButton from '@/components/BackButton.vue';

// Office / departure point: г. Бишкек, ул. Чуй 120
const OFFICE = { lat: 42.8767, lng: 74.6055 };

const configStore = useConfigStore();

const phoneNumber = '+996 708 33 00 03';
const email = 'h833mam@gmail.com';

async function onWhatsApp() {
  const phone = configStore.config?.whatsappPhone ?? phoneNumber;
  await openWhatsApp(phone, 'Здравствуйте! У меня вопрос.');
}
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
      <div style="padding: 8px 0 0"><BackButton /></div>
      <div class="contacts-header">
        <h1 class="contacts-header__title">Контакты</h1>
      </div>

      <!-- Office map: live 2GIS when VITE_2GIS_KEY is set, placeholder otherwise -->
      <!-- <MapView :lat="OFFICE.lat" :lng="OFFICE.lng" :zoom="16">
        <span class="ms" style="font-size: 40px; color: var(--eg-green)">location_on</span>
        <span class="contacts-map__label">[ КАРТА ОФИСА ]</span>
      </MapView> -->

      <!-- Contact items -->
      <div class="contacts-list">
        <a :href="`tel:${phoneNumber.replace(/\s/g, '')}`" class="contact-item">
          <span class="contact-item__icon-wrap ms-wrap" style="background: var(--eg-green-light)">
            <span class="ms" style="color: var(--eg-green)">call</span>
          </span>
          <div class="contact-item__content">
            <div class="contact-item__label">Телефон</div>
            <div class="contact-item__value">{{ phoneNumber }}</div>
          </div>
          <span class="ms contact-item__arrow">chevron_right</span>
        </a>

        <button class="contact-item" @click="onWhatsApp">
          <span class="contact-item__icon-wrap ms-wrap" style="background: #E6F8EC">
            <span class="ms" style="color: #1FAE54">chat</span>
          </span>
          <div class="contact-item__content">
            <div class="contact-item__label">WhatsApp</div>
            <div class="contact-item__value">Написать в чат</div>
          </div>
          <span class="ms contact-item__arrow">chevron_right</span>
        </button>

        <a :href="`mailto:${email}`" class="contact-item">
          <span class="contact-item__icon-wrap ms-wrap" style="background: var(--eg-green-light)">
            <span class="ms" style="color: var(--eg-green)">mail</span>
          </span>
          <div class="contact-item__content">
            <div class="contact-item__label">Email</div>
            <div class="contact-item__value">{{ email }}</div>
          </div>
          <span class="ms contact-item__arrow">chevron_right</span>
        </a>

      </div>

      <div style="height: 32px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .contacts-header { padding: 12px 0 0; }
  .contacts-list { padding: 16px 0; }
}

.contacts-header {
  padding: 12px 18px 0;
}

.contacts-header__title {
  margin: 0;
  font: 800 24px 'Manrope', sans-serif;
  letter-spacing: -0.01em;
  color: var(--eg-ink);
}

.contacts-map {
  margin: 14px 16px 0;
  height: 150px;
  border-radius: 16px;
  background: repeating-linear-gradient(
    135deg,
    #EEF1ED,
    #EEF1ED 11px,
    #E7EAE4 11px,
    #E7EAE4 22px
  );
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contacts-map__label {
  position: absolute;
  bottom: 10px;
  font: 600 11px 'Courier New', monospace;
  color: #A7ACA2;
}

.contacts-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 13px;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 14px;
  padding: 14px 16px;
  text-decoration: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.contact-item--static {
  cursor: default;
  align-items: flex-start;
}

.contact-item--static .contact-item__icon-wrap {
  margin-top: 2px;
}

.contact-item__icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  flex-shrink: 0;
}

.ms-wrap {
  font-family: inherit;
}

.contact-item__content {
  flex: 1;
}

.contact-item__label {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
}

.contact-item__value {
  font: 700 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
  margin-top: 1px;
}

.contact-item__sub {
  font: 500 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-top: 2px;
}

.contact-item__arrow {
  color: #C4C8C0;
  font-size: 20px;
  flex-shrink: 0;
}
</style>
