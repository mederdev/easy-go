<script setup lang="ts">
import { ref, computed } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
import { formatMoney } from '@easygo/shared';
import { useBookingStore } from '../stores/booking.js';
import type { LocalBooking } from '../stores/booking.js';

const store = useBookingStore();
const activeTab = ref<'upcoming' | 'history'>('upcoming');

const displayBookings = computed<LocalBooking[]>(() =>
  activeTab.value === 'upcoming' ? store.upcomingBookings : store.historyBookings
);

function formatDepartDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatDepartTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Новая',
  CONFIRMED: 'Подтверждён',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
};

const DEFAULT_STATUS_STYLE = { bg: '#F0F1EE', color: '#8A8F86' };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  NEW: { bg: '#EEF6E6', color: '#3E7C12' },
  CONFIRMED: { bg: '#EEF6E6', color: '#3E7C12' },
  COMPLETED: { bg: '#F0F1EE', color: '#8A8F86' },
  CANCELLED: { bg: '#FBEDEA', color: '#C0492E' },
};

function statusStyle(status: string) {
  return STATUS_STYLE[status] ?? DEFAULT_STATUS_STYLE;
}
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <!-- Profile Header -->
      <div class="cab-profile">
        <div class="cab-avatar">АК</div>
        <div>
          <div class="cab-profile__name">Акрам</div>
          <div class="cab-profile__phone">+996 700 12 34 56</div>
        </div>
      </div>

      <!-- Bonus Card -->
      <div class="cab-bonus">
        <div>
          <div class="cab-bonus__label">Бонусный баланс</div>
          <div class="cab-bonus__value">1 250 <span class="cab-bonus__unit">баллов</span></div>
        </div>
        <span class="cab-bonus__icon ms-wrap">
          <span class="ms">redeem</span>
        </span>
      </div>

      <!-- Tabs -->
      <div class="cab-tabs">
        <button
          :class="['seg-btn', activeTab === 'upcoming' && 'seg-btn--active']"
          @click="activeTab = 'upcoming'"
        >Предстоящие</button>
        <button
          :class="['seg-btn', activeTab === 'history' && 'seg-btn--active']"
          @click="activeTab = 'history'"
        >История</button>
      </div>

      <!-- Bookings List -->
      <div class="cab-list">
        <template v-if="displayBookings.length > 0">
          <div
            v-for="booking in displayBookings"
            :key="booking.id"
            class="booking-card"
            :style="activeTab === 'history' ? 'opacity: 0.92' : ''"
          >
            <div class="booking-card__header">
              <div class="booking-card__route">{{ booking.routeTitle }}</div>
              <span
                class="booking-card__status"
                :style="{
                  background: statusStyle(booking.status).bg,
                  color: statusStyle(booking.status).color
                }"
              >
                {{ STATUS_LABEL[booking.status] ?? String(booking.status) }}
              </span>
            </div>
            <div class="booking-card__meta">
              <span class="booking-card__meta-item">
                <span class="ms" style="color: var(--eg-green); font-size: 17px">calendar_today</span>
                {{ formatDepartDate(booking.departAt) }}
              </span>
              <span class="booking-card__meta-item">
                <span class="ms" style="color: var(--eg-green); font-size: 17px">schedule</span>
                {{ formatDepartTime(booking.departAt) }}
              </span>
              <span class="booking-card__meta-item">
                <span class="ms" style="color: var(--eg-green); font-size: 17px">group</span>
                {{ booking.pax }}
              </span>
              <span v-if="activeTab === 'history'" class="booking-card__price">
                {{ formatMoney(booking.total) }}
              </span>
            </div>
          </div>
        </template>

        <div v-else class="cab-empty">
          <span class="ms cab-empty__icon">receipt_long</span>
          <div class="cab-empty__text">
            {{ activeTab === 'upcoming' ? 'Предстоящих поездок нет' : 'История поездок пуста' }}
          </div>
        </div>
      </div>

      <div style="height: 32px"></div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
.cab-profile {
  padding: 12px 18px 0;
  display: flex;
  align-items: center;
  gap: 13px;
}

.cab-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--eg-ink);
  color: var(--eg-green-bright);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 800 20px 'Manrope', sans-serif;
  flex-shrink: 0;
}

.cab-profile__name {
  font: 800 19px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.cab-profile__phone {
  font: 600 12px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  margin-top: 2px;
}

.cab-bonus {
  margin: 16px;
  background: linear-gradient(135deg, #16181C, #23261D);
  border-radius: 18px;
  padding: 18px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cab-bonus__label {
  font: 600 12px 'Manrope', sans-serif;
  color: #9CA29A;
}

.cab-bonus__value {
  font: 800 28px 'Manrope', sans-serif;
  color: var(--eg-green-bright);
  margin-top: 2px;
}

.cab-bonus__unit {
  font: 700 15px 'Manrope', sans-serif;
  color: #fff;
}

.cab-bonus__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(86, 169, 25, 0.18);
  color: var(--eg-green-bright);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.ms-wrap {
  font-family: inherit;
}

.cab-tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
}

.seg-btn {
  flex: 1;
  height: 40px;
  border-radius: 11px;
  border: none;
  cursor: pointer;
  font: 700 13.5px 'Manrope', sans-serif;
  background: #F2F3F0;
  color: var(--eg-muted);
  transition: background 0.15s, color 0.15s;
}

.seg-btn--active {
  background: var(--eg-ink);
  color: #fff;
}

.cab-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.booking-card {
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 15px 16px;
}

.booking-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.booking-card__route {
  font: 800 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.booking-card__status {
  padding: 4px 10px;
  border-radius: 999px;
  font: 700 11px 'Manrope', sans-serif;
}

.booking-card__meta {
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font: 600 13px 'Manrope', sans-serif;
  color: var(--eg-muted);
  flex-wrap: wrap;
  align-items: center;
}

.booking-card__meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.booking-card__price {
  font: 600 13px 'Manrope', sans-serif;
  color: var(--eg-muted);
}

.cab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 20px;
}

.cab-empty__icon {
  font-size: 48px;
  color: #D0D4CC;
}

.cab-empty__text {
  font: 600 14px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  text-align: center;
}
</style>
