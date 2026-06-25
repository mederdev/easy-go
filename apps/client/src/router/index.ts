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
        component: () => import('../views/HomePage.vue'),
      },
      {
        path: 'availability',
        component: () => import('../views/AvailabilityPage.vue'),
      },
      {
        path: 'cabinet',
        component: () => import('../views/CabinetPage.vue'),
      },
      {
        path: 'info',
        component: () => import('../views/InfoPage.vue'),
      },
      {
        path: 'about',
        component: () => import('../views/AboutPage.vue'),
      },
      {
        path: 'contacts',
        component: () => import('../views/ContactsPage.vue'),
      },
      {
        path: 'drivers',
        component: () => import('../views/DriversPage.vue'),
      },
      {
        path: 'partners',
        component: () => import('../views/PartnersPage.vue'),
      },
    ],
  },
  {
    path: '/login',
    component: () => import('../views/LoginPage.vue'),
  },
  {
    path: '/trip/:id',
    component: () => import('../views/TripDetailPage.vue'),
  },
  {
    path: '/results',
    component: () => import('../views/ResultsPage.vue'),
  },
  {
    path: '/booking',
    component: () => import('../views/BookingPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/confirm',
    component: () => import('../views/ConfirmPage.vue'),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// Booking requires an authorized customer — send guests to the cabinet (login).
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useAuthStore().isAuthenticated) {
    return '/tabs/cabinet';
  }
  return true;
});

export default router;
