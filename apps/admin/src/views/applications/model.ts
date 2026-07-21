import { onMounted, ref } from 'vue';
import type { DriverApplication, PartnerApplication } from '@easygo/shared';
import { api, errorMessage } from '@/lib/api';
import { useBadgesStore } from '@/stores/badges';
import { initials } from '@/lib/format';

/** Applications inbox: driver/partner tabs with accept/reject actions on the
 *  pending entries. */
export function useApplicationsModel() {
  const badges = useBadgesStore();
  type Tab = 'drivers' | 'partners';
  const tab = ref<Tab>('drivers');

  const loading = ref(true);
  const error = ref<string | null>(null);
  const drivers = ref<DriverApplication[]>([]);
  const partners = ref<PartnerApplication[]>([]);
  const busyId = ref<string | null>(null);

  async function load(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [d, p] = await Promise.all([
        api.applications.listDrivers(),
        api.applications.listPartners(),
      ]);
      drivers.value = d.items;
      partners.value = p.items;
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      loading.value = false;
    }
  }

  async function setDriver(app: DriverApplication, status: 'ACCEPTED' | 'REJECTED'): Promise<void> {
    busyId.value = app.id;
    try {
      const updated = await api.applications.setDriverStatus(app.id, status);
      const idx = drivers.value.findIndex((x) => x.id === app.id);
      if (idx !== -1) drivers.value.splice(idx, 1, updated);
      void badges.refresh();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      busyId.value = null;
    }
  }

  async function setPartner(app: PartnerApplication, status: 'ACCEPTED' | 'REJECTED'): Promise<void> {
    busyId.value = app.id;
    try {
      const updated = await api.applications.setPartnerStatus(app.id, status);
      const idx = partners.value.findIndex((x) => x.id === app.id);
      if (idx !== -1) partners.value.splice(idx, 1, updated);
      void badges.refresh();
    } catch (e) {
      error.value = errorMessage(e);
    } finally {
      busyId.value = null;
    }
  }

  function driverMeta(app: DriverApplication): string {
    const parts = [app.phone];
    parts.push(app.hasCar ? `своё авто: ${app.carInfo ?? 'есть'}` : 'без авто');
    if (app.experience) parts.push(`опыт ${app.experience}`);
    if (app.directions) parts.push(app.directions);
    return parts.join(' · ');
  }

  function isPending(status: string): boolean {
    return status === 'NEW' || status === 'REVIEWING';
  }

  onMounted(load);

  return {
    tab,
    loading,
    error,
    drivers,
    partners,
    busyId,
    load,
    setDriver,
    setPartner,
    driverMeta,
    isPending,
    initials,
  };
}
