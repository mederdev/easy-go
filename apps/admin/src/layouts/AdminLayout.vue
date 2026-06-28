<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { USER_ROLE_LABEL } from '@easygo/shared';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navMain: NavItem[] = [
  { to: '/', label: 'Дашборд', icon: 'dashboard' },
  { to: '/bookings', label: 'Бронирования', icon: 'receipt_long' },
  { to: '/flights', label: 'Рейсы', icon: 'event_seat' },
  { to: '/routes', label: 'Маршруты', icon: 'route' },
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

const menuOpen = ref(false);

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
    dashboard: '/bookings',
    bookings: '/bookings',
    flights: '/flights',
    routes: '/routes',
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
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">EASY<span>GO</span></div>
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
          {{ ctaLabel }}
        </button>
        <div class="user-menu">
          <button class="bell" type="button" @click="menuOpen = !menuOpen">
            <span class="material-symbols-outlined">notifications</span>
            <span class="dot" />
          </button>
          <button class="avatar-btn" type="button" @click="menuOpen = !menuOpen">
            {{ auth.initials }}
          </button>
          <div v-if="menuOpen" class="dropdown" @click="menuOpen = false">
            <div class="dropdown-name">{{ userName }}</div>
            <div class="dropdown-role">{{ userRole }}</div>
            <button class="dropdown-logout" type="button" @click="logout">
              <span class="material-symbols-outlined">logout</span>
              Выйти
            </button>
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
  font: 800 22px var(--eg-font);
  letter-spacing: -0.02em;
  padding: 4px 8px 4px;
  color: var(--eg-ink);
}
.logo span {
  color: var(--eg-brand);
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
.titles {
  flex: 1;
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
.avatar-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: var(--eg-ink);
  color: var(--eg-brand-bright);
  font: 800 14px var(--eg-font);
  cursor: pointer;
}
.dropdown {
  position: absolute;
  top: 52px;
  right: 0;
  width: 200px;
  background: #fff;
  border: 1px solid #e7e9e5;
  border-radius: 14px;
  box-shadow: 0 18px 40px -18px rgba(20, 30, 10, 0.3);
  padding: 14px;
  z-index: 30;
}
.dropdown-name {
  font: 800 14px var(--eg-font);
}
.dropdown-role {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
  margin-bottom: 10px;
}
.dropdown-logout {
  width: 100%;
  height: 40px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  background: #fff;
  color: #c0492e;
  font: 700 13px var(--eg-font);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.dropdown-logout .material-symbols-outlined {
  font-size: 18px;
}

/* Content */
.content {
  flex: 1;
  overflow: auto;
  padding: 24px 28px;
}
</style>
