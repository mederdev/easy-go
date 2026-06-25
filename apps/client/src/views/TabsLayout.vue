<script setup lang="ts">
import { IonPage, IonTabs, IonTabBar, IonTabButton, IonLabel, IonRouterOutlet } from '@ionic/vue';
</script>

<template>
  <IonPage>
    <IonTabs>
      <IonRouterOutlet />
      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/tabs/home">
          <span class="ms tab-icon">home</span>
          <IonLabel>Главная</IonLabel>
        </IonTabButton>
        <IonTabButton tab="availability" href="/tabs/availability">
          <span class="ms tab-icon">directions_car</span>
          <IonLabel>Транспорт</IonLabel>
        </IonTabButton>
        <IonTabButton tab="info" href="/tabs/info">
          <span class="ms tab-icon">info</span>
          <IonLabel>Инфо</IonLabel>
        </IonTabButton>
        <IonTabButton tab="cabinet" href="/tabs/cabinet">
          <span class="ms tab-icon">account_circle</span>
          <IonLabel>Кабинет</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  </IonPage>
</template>

<style scoped>
.tab-icon {
  font-size: 23px;
  line-height: 1;
  display: block;
  margin-bottom: 2px;
}
</style>
