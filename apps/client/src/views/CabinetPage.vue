<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import { useRouter } from 'vue-router';
import type { Booking } from '@easygo/shared';
import { BOOKING_STATUS_LABEL, formatMoney } from '@easygo/shared';
import { useAuthStore } from '../stores/auth.js';
import { api } from '../lib/api.js';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import ErrorBanner from '../components/ErrorBanner.vue';

const router = useRouter();
const auth = useAuthStore();

const activeTab = ref<'upcoming' | 'history'>('upcoming');
const bookings = ref<Booking[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '👤';
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  NEW: { bg: '#EEF6E6', color: '#3E7C12' },
  CONFIRMED: { bg: '#EEF6E6', color: '#3E7C12' },
  COMPLETED: { bg: '#F0F1EE', color: '#8A8F86' },
  CANCELLED: { bg: '#FBEDEA', color: '#C0492E' },
};
function statusStyle(s: string) {
  return STATUS_STYLE[s] ?? { bg: '#F0F1EE', color: '#8A8F86' };
}

function isUpcoming(b: Booking): boolean {
  const future = b.flight?.departAt ? new Date(b.flight.departAt).getTime() >= Date.now() : false;
  return future && (b.status === 'NEW' || b.status === 'CONFIRMED');
}

const upcoming = computed(() => bookings.value.filter(isUpcoming));
const history = computed(() => bookings.value.filter((b) => !isUpcoming(b)));
const shown = computed(() => (activeTab.value === 'upcoming' ? upcoming.value : history.value));

function routeTitle(b: Booking): string {
  const r = b.flight?.route;
  return r ? `${r.fromCity} → ${r.toCity}` : b.code;
}
function dateLabel(b: Booking): string {
  return b.flight?.departAt
    ? new Date(b.flight.departAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : '';
}
function timeLabel(b: Booking): string {
  return b.flight?.departAt
    ? new Date(b.flight.departAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '';
}

async function load(): Promise<void> {
  if (!auth.isAuthenticated) return;
  loading.value = true;
  error.value = null;
  try {
    if (!auth.client) await auth.fetchMe();
    const res = await api.me.bookings({ limit: 50, offset: 0 });
    bookings.value = res.items;
  } catch {
    error.value = 'Не удалось загрузить поездки';
  } finally {
    loading.value = false;
  }
}

function logout(): void {
  auth.logout();
  bookings.value = [];
}

onMounted(load);
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <!-- GUEST -->
      <div v-if="!auth.isAuthenticated" class="guest">
        <div class="guest-icon"><span class="ms">account_circle</span></div>
        <h1 class="guest-title">Войдите в кабинет</h1>
        <p class="guest-text">Авторизуйтесь по номеру телефона, чтобы видеть свои поездки, статусы броней и оформлять заявки в один тап.</p>
        <button class="primary" @click="router.push('/login')"><span class="ms">login</span>Войти по номеру</button>
        <div class="perks">
          <div class="perk"><span class="ms perk-ic">history</span>История и статусы всех поездок</div>
          <div class="perk"><span class="ms perk-ic">bolt</span>Бронь без повторного ввода данных</div>
        </div>
      </div>

      <!-- LOGGED IN -->
      <template v-else>
        <div class="profile">
          <div class="avatar">{{ initials(auth.client?.name ?? '') }}</div>
          <div class="profile-main">
            <div class="profile-name">{{ auth.client?.name }}</div>
            <div class="profile-phone">{{ auth.client?.phone }}</div>
          </div>
          <button class="logout" @click="logout"><span class="ms" style="font-size: 16px">logout</span>Выйти</button>
        </div>

        <div class="tabs">
          <button :class="['seg', activeTab === 'upcoming' && 'seg--on']" @click="activeTab = 'upcoming'">Предстоящие</button>
          <button :class="['seg', activeTab === 'history' && 'seg--on']" @click="activeTab = 'history'">История</button>
        </div>

        <LoadingSpinner v-if="loading" label="Загружаем поездки…" />
        <ErrorBanner v-else-if="error" :message="error" style="margin: 0 16px" />

        <div v-else class="list">
          <button
            v-for="b in shown"
            :key="b.id"
            class="card"
            :style="activeTab === 'history' ? 'opacity:.92' : ''"
            @click="router.push(`/trip/${b.id}`)"
          >
            <div class="card-head">
              <div class="card-route">{{ routeTitle(b) }}</div>
              <span class="chip" :style="{ background: statusStyle(b.status).bg, color: statusStyle(b.status).color }">
                {{ BOOKING_STATUS_LABEL[b.status] }}
              </span>
            </div>
            <div class="card-meta">
              <span class="mi"><span class="ms gi">calendar_today</span>{{ dateLabel(b) }}</span>
              <span class="mi"><span class="ms gi">schedule</span>{{ timeLabel(b) }}</span>
              <span class="mi"><span class="ms gi">group</span>{{ b.pax }}</span>
            </div>
            <div class="card-foot">
              <span class="total">{{ formatMoney(b.total) }}</span>
              <span class="more">Подробнее<span class="ms" style="font-size: 16px">chevron_right</span></span>
            </div>
          </button>

          <div v-if="shown.length === 0" class="empty">
            <span class="ms empty-ic">receipt_long</span>
            <div class="empty-text">{{ activeTab === 'upcoming' ? 'Предстоящих поездок нет' : 'История поездок пуста' }}</div>
          </div>
        </div>
      </template>

      <div style="height: 96px"></div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
/* Guest */
.guest { padding: 44px 22px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.guest-icon {
  width: 96px; height: 96px; border-radius: 50%; background: #f2f3f0;
  display: flex; align-items: center; justify-content: center; margin-bottom: 18px;
}
.guest-icon .ms { font-size: 48px; color: var(--eg-muted-light); }
.guest-title { margin: 0; font: 800 23px 'Manrope', sans-serif; }
.guest-text { margin: 10px 0 0; font: 500 14px/1.5 'Manrope', sans-serif; color: var(--eg-muted); max-width: 270px; }
.perks { margin-top: 22px; width: 100%; display: flex; flex-direction: column; gap: 10px; }
.perk {
  display: flex; gap: 11px; align-items: center; background: var(--eg-bg-subtle); border-radius: 13px;
  padding: 13px 14px; text-align: left; font: 600 13px 'Manrope', sans-serif; color: #4a4f55;
}
.perk-ic { color: var(--eg-green); font-size: 20px; }

/* Profile */
.profile { padding: 12px 18px 0; display: flex; align-items: center; gap: 13px; }
.avatar {
  width: 52px; height: 52px; border-radius: 50%; background: var(--eg-ink); color: var(--eg-green-bright);
  display: flex; align-items: center; justify-content: center; font: 800 20px 'Manrope', sans-serif; flex-shrink: 0;
}
.profile-main { flex: 1; }
.profile-name { font: 800 19px 'Manrope', sans-serif; }
.profile-phone { font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted-light); margin-top: 2px; }
.logout {
  height: 34px; padding: 0 13px; border: 1px solid #e2e5df; background: #fff; border-radius: 10px;
  font: 700 12px 'Manrope', sans-serif; color: var(--eg-muted); cursor: pointer; display: flex; align-items: center; gap: 5px;
}

/* Tabs */
.tabs { display: flex; gap: 8px; padding: 18px 16px 12px; }
.seg {
  flex: 1; height: 40px; border-radius: 11px; border: none; cursor: pointer;
  font: 700 13.5px 'Manrope', sans-serif; background: #f2f3f0; color: var(--eg-muted);
}
.seg--on { background: var(--eg-ink); color: #fff; }

/* List */
.list { padding: 0 16px; display: flex; flex-direction: column; gap: 10px; }
.card {
  width: 100%; text-align: left; background: #fff; border: 1px solid #eceee9; border-radius: 16px;
  padding: 15px 16px; cursor: pointer;
}
.card-head { display: flex; justify-content: space-between; align-items: center; }
.card-route { font: 800 15px 'Manrope', sans-serif; }
.chip { padding: 4px 10px; border-radius: 999px; font: 700 11px 'Manrope', sans-serif; }
.card-meta { display: flex; gap: 16px; margin-top: 10px; font: 600 13px 'Manrope', sans-serif; color: var(--eg-muted); }
.mi { display: flex; align-items: center; gap: 5px; }
.gi { color: var(--eg-green); font-size: 17px; }
.card-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f1ee;
}
.total { font: 800 16px 'Manrope', sans-serif; }
.more { font: 700 12px 'Manrope', sans-serif; color: var(--eg-green); display: flex; align-items: center; gap: 3px; }

/* Empty */
.empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; }
.empty-ic { font-size: 48px; color: #d0d4cc; }
.empty-text { font: 600 14px 'Manrope', sans-serif; color: var(--eg-muted-light); }

/* Shared */
.primary {
  width: 100%; margin-top: 24px; height: 54px; border: none; border-radius: 15px;
  background: var(--eg-green); color: #fff; font: 700 16px 'Manrope', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
</style>
