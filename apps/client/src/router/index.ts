import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import TabsLayout from '../views/TabsLayout.vue';
import { useAuthStore } from '../stores/auth.js';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/tabs/home',
  },
  {
    path: '/tabs',
    component: TabsLayout,
    children: [
      {
        path: '',
        redirect: '/tabs/home',
      },
      {
        path: 'home',
        component: () => import('../views/home/index.vue'),
      },
      {
        path: 'availability',
        component: () => import('../views/availability/index.vue'),
      },
      {
        path: 'cabinet',
        component: () => import('../views/cabinet/index.vue'),
      },
      {
        path: 'info',
        component: () => import('../views/info/index.vue'),
      },
      {
        path: 'about',
        component: () => import('../views/about/index.vue'),
      },
      {
        path: 'contacts',
        component: () => import('../views/contacts/index.vue'),
      },
      {
        path: 'drivers',
        component: () => import('../views/drivers/index.vue'),
      },
      {
        path: 'partners',
        component: () => import('../views/partners/index.vue'),
      },
    ],
  },
  {
    path: '/login',
    component: () => import('../views/login/index.vue'),
  },
  {
    path: '/trip/:id',
    component: () => import('../views/trip-detail/index.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/results',
    component: () => import('../views/results/index.vue'),
  },
  {
    path: '/booking',
    component: () => import('../views/booking/index.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/confirm',
    component: () => import('../views/confirm/index.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    component: () => import('../views/profile/index.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Guarded routes require an authorized customer. Send guests to login with a
// `redirect` back to the intended page, so after logging in they land on the
// action they were trying to do ("log in, then continue").
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuthStore().isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
