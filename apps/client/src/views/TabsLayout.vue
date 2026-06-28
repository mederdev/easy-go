<script setup lang="ts">
import { IonPage, IonTabs, IonTabBar, IonTabButton, IonLabel, IonRouterOutlet } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();

const navItems = [
  { tab: 'home', href: '/tabs/home', icon: 'home', label: 'Главная' },
  { tab: 'availability', href: '/tabs/availability', icon: 'directions_car', label: 'Транспорт' },
  { tab: 'info', href: '/tabs/info', icon: 'info', label: 'Инфо' },
  { tab: 'cabinet', href: '/tabs/cabinet', icon: 'account_circle', label: 'Кабинет' },
] as const;

const currentPath = computed(() => router.currentRoute.value.path);

function isActive(href: string) {
  return currentPath.value === href || currentPath.value.startsWith(href + '/');
}
</script>

<template>
  <IonPage>
    <!-- Desktop floating bottom nav — hidden on mobile via CSS -->
    <nav class="d-bottom-nav">
      <button
        v-for="item in navItems"
        :key="item.tab"
        class="d-bottom-nav__item"
        :class="isActive(item.href) && 'd-bottom-nav__item--active'"
        @click="router.push(item.href)"
      >
        <span class="ms d-bottom-nav__icon">{{ item.icon }}</span>
        <span class="d-bottom-nav__label">{{ item.label }}</span>
      </button>
    </nav>

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

/* Desktop elements — hidden on mobile */
.d-bottom-nav {
  display: none;
}

/* ---- Desktop ---- */
@media (min-width: 768px) {
  /* Floating pill nav at the bottom center */
  .d-bottom-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 300;
    background: #fff;
    border-radius: 22px;
    padding: 6px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.06);
  }

  /* Add some bottom padding to page content so it doesn't hide behind the nav */
  ion-tabs {
    padding-bottom: 88px;
  }
}

.d-bottom-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 22px;
  border-radius: 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}

.d-bottom-nav__item:hover {
  background: #F5F6F3;
}

.d-bottom-nav__item--active {
  background: #EEF6E6;
}

.d-bottom-nav__item--active .d-bottom-nav__icon,
.d-bottom-nav__item--active .d-bottom-nav__label {
  color: #56A919;
}

.d-bottom-nav__icon {
  font-size: 22px;
  color: #A7ACA2;
  line-height: 1;
}

.d-bottom-nav__label {
  font: 700 11px 'Manrope', sans-serif;
  color: #6B706A;
  white-space: nowrap;
}
</style>
