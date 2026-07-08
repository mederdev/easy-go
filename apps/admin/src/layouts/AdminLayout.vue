<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { USER_ROLE_LABEL } from '@easygo/shared';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navMain: NavItem[] = [
  { to: '/', label: 'Бронирования', icon: 'receipt_long' },
  { to: '/flights', label: 'Рейсы', icon: 'event_seat' },
  { to: '/routes', label: 'Маршруты', icon: 'route' },
  { to: '/service-addons', label: 'Доп. услуги', icon: 'storefront' },
  { to: '/fleet', label: 'Автопарк', icon: 'directions_car' },
  { to: '/drivers', label: 'Водители', icon: 'person' },
  { to: '/clients', label: 'Клиенты', icon: 'groups' },
  { to: '/analytics', label: 'Аналитика', icon: 'monitoring' },
];

const navSecondary: NavItem[] = [
  { to: '/applications', label: 'Заявки на сотр.', icon: 'handshake' },
  { to: '/settings', label: 'Настройки', icon: 'settings' },
];

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const title = computed(() => (route.meta.title as string | undefined) ?? 'EasyGo');
const subtitle = computed(() => (route.meta.subtitle as string | undefined) ?? '');
const ctaLabel = computed(() => (route.meta.cta as string | null | undefined) ?? null);

const userName = computed(() => auth.user?.name ?? 'Оператор');
const userRole = computed(() =>
  auth.user ? USER_ROLE_LABEL[auth.user.role] : 'Диспетчерская',
);

/** Notifications dropdown state (no API yet — always shows an empty state). */
const notifOpen = ref(false);
/** Mobile off-canvas navigation drawer state (desktop ignores this). */
const navOpen = ref(false);

// Close the mobile nav whenever the route changes.
watch(
  () => route.path,
  () => {
    navOpen.value = false;
  },
);

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/';
  return route.path === to || route.path.startsWith(`${to}/`);
}

function logout(): void {
  auth.logout();
  void router.push({ name: 'login' });
}

/** The topbar CTA simply navigates to the relevant create surface. */
function onCta(): void {
  const map: Record<string, string> = {
    bookings: '/',
    flights: '/flights',
    routes: '/routes',
    'service-addons': '/service-addons',
    fleet: '/fleet',
    drivers: '/drivers',
    clients: '/clients',
    applications: '/applications',
    settings: '/settings',
    analytics: '/analytics',
  };
  const target = map[(route.name as string) ?? ''] ?? route.path;
  // Signal the view to open its create form via a query flag it can watch.
  void router.push({ path: target, query: { ...route.query, create: '1' } });
}
</script>

<template>
  <div class="shell">
    <!-- Backdrop for the mobile nav drawer -->
    <div
      v-if="navOpen"
      class="nav-backdrop"
      @click="navOpen = false"
    />

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: navOpen }">
      <div class="logo"><img src="/assets/logo-t.png" alt="EasyGo" /></div>
      <div class="section-label">Панель управления</div>
      <nav class="nav" data-scroll>
        <RouterLink
          v-for="item in navMain"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
        >
          <span class="material-symbols-outlined">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
        <div class="divider" />
        <RouterLink
          v-for="item in navSecondary"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
        >
          <span class="material-symbols-outlined">{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>
      <button class="user" type="button" @click="logout">
        <span class="avatar">{{ auth.initials }}</span>
        <span class="user-meta">
          <span class="user-name">{{ userName }}</span>
          <span class="user-role">{{ userRole }}</span>
        </span>
        <span class="material-symbols-outlined logout-icon">logout</span>
      </button>
    </aside>

    <!-- Main column -->
    <div class="main">
      <header class="topbar">
        <button class="hamburger" type="button" @click="navOpen = true">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <div class="titles">
          <div class="title">{{ title }}</div>
          <div class="subtitle">{{ subtitle }}</div>
        </div>
        <button
          v-if="ctaLabel"
          class="cta"
          type="button"
          @click="onCta"
        >
          <span class="material-symbols-outlined">add</span>
          <span class="cta-label">{{ ctaLabel }}</span>
        </button>
        <div class="user-menu">
          <button class="bell" type="button" @click="notifOpen = !notifOpen">
            <span class="material-symbols-outlined">notifications</span>
            <span class="dot" />
          </button>
          <div v-if="notifOpen" class="dropdown notif-dropdown">
            <div class="notif-title">Уведомления</div>
            <div class="notif-empty">
              <span class="material-symbols-outlined">notifications_off</span>
              <span>Уведомлений нет</span>
            </div>
          </div>
        </div>
      </header>

      <main class="content" data-scroll>
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f4f5f2;
}

/* Sidebar */
.sidebar {
  width: 250px;
  flex: none;
  background: #fff;
  border-right: 1px solid #e7e9e5;
  display: flex;
  flex-direction: column;
  padding: 20px 16px;
}
.logo {
  padding: 4px 8px 4px;
}
.logo img {
  height: 32px;
  width: auto;
  display: block;
}
.section-label {
  font: 700 11px var(--eg-font);
  letter-spacing: 0.12em;
  color: #a7aca2;
  text-transform: uppercase;
  padding: 14px 8px 6px;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: auto;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  text-align: left;
  border: none;
  border-radius: 11px;
  padding: 11px 12px;
  cursor: pointer;
  font: 700 13.5px var(--eg-font);
  background: transparent;
  color: #5a6066;
  text-decoration: none;
}
.nav-item .material-symbols-outlined {
  font-size: 21px;
}
.nav-item.active {
  background: var(--eg-brand-light);
  color: var(--eg-brand-dark);
}
.divider {
  height: 1px;
  background: #eef0ec;
  margin: 8px 8px;
}
.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: none;
  border-top: 1px solid #eef0ec;
  background: transparent;
  margin-top: 8px;
  cursor: pointer;
  text-align: left;
}
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--eg-ink);
  color: var(--eg-brand-bright);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 800 14px var(--eg-font);
  flex: none;
}
.user-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.user-name {
  font: 700 13px var(--eg-font);
}
.user-role {
  font: 500 11px var(--eg-font);
  color: var(--eg-hint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.logout-icon {
  font-size: 20px;
  color: #b4b9b0;
}

/* Main */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  flex: none;
  height: 68px;
  background: #fff;
  border-bottom: 1px solid #e7e9e5;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 28px;
}
.hamburger {
  display: none;
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 12px;
  border: 1px solid #e7e9e5;
  background: #fff;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}
.hamburger .material-symbols-outlined {
  font-size: 24px;
  color: #5a6066;
}
.nav-backdrop {
  display: none;
}
.titles {
  flex: 1;
  min-width: 0;
}
.title,
.subtitle {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title {
  font: 800 20px var(--eg-font);
  letter-spacing: -0.01em;
}
.subtitle {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
}
.cta {
  height: 42px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: var(--eg-brand);
  color: #fff;
  font: 700 14px var(--eg-font);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 7px;
}
.cta .material-symbols-outlined {
  font-size: 20px;
}
.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}
.bell {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid #e7e9e5;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.bell .material-symbols-outlined {
  font-size: 21px;
  color: #5a6066;
}
.bell .dot {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--eg-brand);
  border: 2px solid #fff;
}
.dropdown {
  position: absolute;
  top: 52px;
  right: 0;
  width: 280px;
  background: #fff;
  border: 1px solid #e7e9e5;
  border-radius: 14px;
  box-shadow: 0 18px 40px -18px rgba(20, 30, 10, 0.3);
  padding: 14px;
  z-index: 30;
}
.notif-title {
  font: 800 14px var(--eg-font);
  margin-bottom: 12px;
}
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 22px 0 18px;
  color: var(--eg-hint);
  font: 600 13px var(--eg-font);
}
.notif-empty .material-symbols-outlined {
  font-size: 30px;
  color: #c2c7bd;
}

/* Content */
.content {
  flex: 1;
  overflow: auto;
  padding: 24px 28px;
}

/* ── Mobile / tablet: sidebar becomes an off-canvas drawer ── */
@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 60;
    width: 264px;
    transform: translateX(-100%);
    transition: transform 0.24s ease;
    box-shadow: 12px 0 40px -16px rgba(20, 30, 10, 0.35);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .nav-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(16, 18, 20, 0.4);
    z-index: 55;
  }
  .hamburger {
    display: flex;
  }
  .topbar {
    height: 60px;
    padding: 0 16px;
    gap: 12px;
  }
  .title {
    font-size: 17px;
  }
  .subtitle {
    display: none;
  }
  .content {
    padding: 16px;
  }
}

/* On small phones, collapse the CTA label to just its icon. */
@media (max-width: 560px) {
  .cta {
    padding: 0 14px;
  }
  .cta-label {
    display: none;
  }
}
</style>
