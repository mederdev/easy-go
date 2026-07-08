<script setup lang="ts">
import { IonPage, IonRouterOutlet, useIonRouter } from '@ionic/vue';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { slideAnimation, setSlideDirection } from '../lib/nav-animation.js';

const router = useRouter();
const ionRouter = useIonRouter();

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

// Navigate to a tab, sliding in from the side we're heading toward: tabs further
// right in the bar slide in from the right, tabs to the left slide in from the
// left. Same handler powers both the desktop pill nav and the mobile tab bar.
//
// We drive `IonRouterOutlet` directly rather than wrapping it in `IonTabs`: the
// tab machinery intercepts button clicks to select a registered `<ion-tab>`, and
// with our manual (href-less) navigation that lookup fails ("Tab with id
// undefined does not exist") and the outlet never advances.
function go(href: string) {
  if (isActive(href)) return;
  const from = navItems.findIndex((i) => isActive(i.href));
  const to = navItems.findIndex((i) => i.href === href);
  const direction = to > from ? 'forward' : 'back';
  setSlideDirection(direction);
  ionRouter.navigate(href, direction, 'replace', slideAnimation);
}
</script>

<template>
  <IonPage>
    <!-- Router outlet fills the space above the nav. `ion-router-outlet` is
         absolutely positioned, so it needs a sized, relatively-positioned host. -->
    <div class="tabs-outlet">
      <IonRouterOutlet />
    </div>

    <!-- Desktop floating bottom nav — hidden on mobile via CSS -->
    <nav class="d-bottom-nav">
      <button
        v-for="item in navItems"
        :key="item.tab"
        class="d-bottom-nav__item"
        :class="isActive(item.href) && 'd-bottom-nav__item--active'"
        @click="go(item.href)"
      >
        <span class="ms d-bottom-nav__icon">{{ item.icon }}</span>
        <span class="d-bottom-nav__label">{{ item.label }}</span>
      </button>
    </nav>

    <!-- Mobile bottom tab bar — takes layout space so it never overlaps content -->
    <nav class="m-tab-bar">
      <button
        v-for="item in navItems"
        :key="item.tab"
        class="m-tab-bar__item"
        :class="{ 'm-tab-bar__item--active': isActive(item.href) }"
        @click="go(item.href)"
      >
        <span class="ms m-tab-bar__icon">{{ item.icon }}</span>
        <span class="m-tab-bar__label">{{ item.label }}</span>
      </button>
    </nav>
  </IonPage>
</template>

<style scoped>
/* IonPage is a flex column; the outlet takes the remaining height above the bar. */
.tabs-outlet {
  position: relative;
  flex: 1;
  contain: layout size style;
}

/* ---- Mobile tab bar (matches the former ion-tab-bar) ---- */
.m-tab-bar {
  display: flex;
  height: 74px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border-top: 1px solid #EEF0EC;
  background: #fff;
  flex-shrink: 0;
}

.m-tab-bar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #A7ACA2;
}

.m-tab-bar__item--active {
  color: #56A919;
}

.m-tab-bar__icon {
  font-size: 23px;
  line-height: 1;
}

.m-tab-bar__label {
  font: 700 10px 'Manrope', sans-serif;
}

/* Desktop elements — hidden on mobile */
.d-bottom-nav {
  display: none;
}

/* ---- Desktop ---- */
@media (min-width: 768px) {
  /* Hide the mobile tab bar */
  .m-tab-bar {
    display: none;
  }

  /* Leave room below page content for the floating pill nav */
  .tabs-outlet {
    margin-bottom: 88px;
  }

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
