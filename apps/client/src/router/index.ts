import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import TabsLayout from '../views/TabsLayout.vue';

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
    path: '/results',
    component: () => import('../views/ResultsPage.vue'),
  },
  {
    path: '/booking',
    component: () => import('../views/BookingPage.vue'),
  },
  {
    path: '/confirm',
    component: () => import('../views/ConfirmPage.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
