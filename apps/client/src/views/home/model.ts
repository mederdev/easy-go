import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { onIonViewWillEnter } from '@ionic/vue';
import type { Route } from '@easygo/shared';
import { api } from '@/lib/api';

/** Home screen: hero, search widget, and popular routes fetched on every visit
 *  (onIonViewWillEnter re-fires even when the tab page is already mounted). */
export function useHomeModel() {
  const router = useRouter();

  const routes = ref<Route[]>([]);
  const routesLoading = ref(false);

  onIonViewWillEnter(async () => {
    routesLoading.value = true;
    try {
      routes.value = await api.routes.public();
    } catch {
      // Use static fallback routes from mock
    } finally {
      routesLoading.value = false;
    }
  });

  const staticRoutes = [
    { fromCity: 'Бишкек', toCity: 'Алматы', duration: '~4 ч · ежедневно', price: 350000 },
    { fromCity: 'Алматы', toCity: 'Бишкек', duration: '~4 ч · ежедневно', price: 350000 },
    { fromCity: 'Бишкек', toCity: 'Иссык-Куль', duration: '~5 ч · ежедневно', price: 200000 },
  ];

  return {
    router,
    routes,
    routesLoading,
    staticRoutes,
  };
}
