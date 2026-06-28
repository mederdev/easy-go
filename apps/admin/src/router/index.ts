import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: 'Дашборд', subtitle: 'Обзор за сегодня', cta: 'Новое бронирование' },
      },
      {
        path: 'bookings',
        name: 'bookings',
        component: () => import('@/views/bookings/index.vue'),
        meta: { title: 'Бронирования', subtitle: 'CRM · заявки клиентов', cta: 'Новое бронирование' },
      },
      {
        path: 'flights',
        name: 'flights',
        component: () => import('@/views/flights/index.vue'),
        meta: { title: 'Рейсы', subtitle: 'Расписание и загрузка', cta: 'Создать рейс' },
      },
      {
        path: 'routes',
        name: 'routes',
        component: () => import('@/views/routes/index.vue'),
        meta: { title: 'Маршруты', subtitle: 'Направления и цены', cta: 'Добавить маршрут' },
      },
      {
        path: 'fleet',
        name: 'fleet',
        component: () => import('@/views/fleet/index.vue'),
        meta: { title: 'Автопарк', subtitle: 'Транспорт и статусы', cta: 'Добавить авто' },
      },
      {
        path: 'drivers',
        name: 'drivers',
        component: () => import('@/views/drivers/index.vue'),
        meta: { title: 'Водители', subtitle: 'Список и доступ', cta: null },
      },
      {
        path: 'clients',
        name: 'clients',
        component: () => import('@/views/clients/index.vue'),
        meta: { title: 'Клиенты', subtitle: 'База клиентов', cta: null },
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: () => import('@/views/analytics/index.vue'),
        meta: { title: 'Аналитика', subtitle: 'Показатели бизнеса', cta: null },
      },
      {
        path: 'applications',
        name: 'applications',
        component: () => import('@/views/applications/index.vue'),
        meta: { title: 'Заявки на сотрудничество', subtitle: 'Водители и партнёры', cta: null },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: 'Настройки', subtitle: 'Параметры платформы', cta: null },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }
  return true;
});
