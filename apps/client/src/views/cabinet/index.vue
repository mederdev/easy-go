<script setup lang="ts">
import { IonPage, IonContent, onIonViewWillEnter } from '@ionic/vue';
import BookingCardSkeleton from '@/components/BookingCardSkeleton.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useCabinetModel } from './model';

const {
  router,
  auth,
  activeTab,
  loading,
  error,
  initials,
  statusStyle,
  flightStatusStyle,
  paymentStatusStyle,
  shown,
  routeTitle,
  dateLabel,
  timeLabel,
  logout,
  BOOKING_STATUS_LABEL,
  FLIGHT_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  APPLICATION_STATUS_LABEL,
  CAR_TYPE_LABEL,
  formatMoney,
  customRequests,
  customStatusStyle,
  customRouteTitle,
  customDateLabel,
  customBusyId,
  customActionError,
  customConfirmId,
  askRemoveCustomRequest,
  clearCustomConfirm,
  removeLabel,
  removeCustomRequest,
  driverFlightTab,
  driverShown,
  statusChanging,
  statusChangeError,
  selectedFlight,
  openFlight,
  closeFlight,
  changeFlightStatus,
  driverFlightRoute,
  driverFlightDate,
  driverFlightTime,
  nextStatus,
  nextStatusLabel,
  paymentBusy,
  paymentError,
  markBookingPaid,
  markFlightPaid,
  callPassenger,
  whatsappPassenger,
  stopBusy,
  toggleStopPicked,
  STOP_KIND_LABEL,
  menuOpen,
  menuWrapEl,
  toggleMenu,
  closeMenu,
  refresh,
} = useCabinetModel();

// Re-fetch bookings/requests each time the tab is shown, so a status change
// made in the CRM (e.g. NEW → CONFIRMED) appears without a full page reload.
onIonViewWillEnter(refresh);
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">

      <!-- GUEST -->
      <div v-if="!auth.isAuthenticated" class="guest">
        <div class="guest-icon"><span class="ms">account_circle</span></div>
        <h1 class="guest-title">Войдите в кабинет</h1>
        <p class="guest-text">Войдите или зарегистрируйтесь, чтобы видеть свои поездки, статусы броней и оформлять заявки в один тап.</p>
        <button class="primary" @click="router.push('/login')"><span class="ms">login</span>Войти</button>
        <div class="perks">
          <div class="perk"><span class="ms perk-ic">history</span>История и статусы всех поездок</div>
          <div class="perk"><span class="ms perk-ic">bolt</span>Бронь без повторного ввода данных</div>
        </div>
      </div>

      <!-- ── DRIVER CABINET ── -->
      <template v-else-if="auth.isDriver">
        <div class="profile">
          <div class="avatar driver-avatar"><span class="ms" style="font-size: 22px">directions_car</span></div>
          <div class="profile-main">
            <div class="profile-name">{{ auth.driver?.name }}</div>
            <div class="profile-phone">{{ auth.driver?.phone }}</div>
          </div>
          <button class="logout" @click="logout"><span class="ms" style="font-size: 16px">logout</span>Выйти</button>
        </div>

        <!-- Assigned cars -->
        <div v-if="auth.driver?.cars?.length" class="cars">
          <div class="cars-label">Мои авто</div>
          <div
            v-for="car in auth.driver.cars"
            :key="car.id"
            class="car-item"
          >
            <span class="ms car-ic">directions_car</span>
            <span class="car-model">{{ car.model }}</span>
            <span class="car-plate">{{ car.plate }}</span>
            <span class="car-seats">{{ car.seats }} мест</span>
          </div>
        </div>

        <div class="tabs">
          <button :class="['seg', driverFlightTab === 'upcoming' && 'seg--on']" @click="driverFlightTab = 'upcoming'">Предстоящие</button>
          <button :class="['seg', driverFlightTab === 'history' && 'seg--on']" @click="driverFlightTab = 'history'">История</button>
        </div>

        <BookingCardSkeleton v-if="loading" />
        <ErrorBanner v-else-if="error" :message="error" style="margin: 0 16px" />

        <div v-else class="list">
          <button
            v-for="f in driverShown"
            :key="f.id"
            class="card"
            :style="driverFlightTab === 'history' ? 'opacity:.92' : ''"
            @click="openFlight(f)"
          >
            <div class="card-head">
              <div class="card-route">{{ driverFlightRoute(f) }}</div>
              <div class="chip-stack">
                <span class="chip" :style="{ background: flightStatusStyle(f.status).bg, color: flightStatusStyle(f.status).color }">
                  {{ FLIGHT_STATUS_LABEL[f.status] }}
                </span>
                <span class="chip" :style="{ background: paymentStatusStyle(f.paymentStatus).bg, color: paymentStatusStyle(f.paymentStatus).color }">
                  {{ PAYMENT_STATUS_LABEL[f.paymentStatus] }}
                </span>
              </div>
            </div>
            <div class="card-meta">
              <span class="mi"><span class="ms gi">calendar_today</span>{{ driverFlightDate(f) }}</span>
              <span class="mi"><span class="ms gi">schedule</span>{{ driverFlightTime(f) }}</span>
              <span class="mi"><span class="ms gi">group</span>{{ f.seatsTaken }}/{{ f.seatsTotal }}</span>
            </div>
            <div v-if="f.car" class="card-car">
              <span class="ms gi" style="font-size:16px">directions_car</span>
              {{ f.car.model }} · {{ f.car.plate }}
            </div>
          </button>

          <div v-if="driverShown.length === 0" class="empty">
            <span class="ms empty-ic">event_seat</span>
            <div class="empty-text">{{ driverFlightTab === 'upcoming' ? 'Предстоящих рейсов нет' : 'История рейсов пуста' }}</div>
          </div>
        </div>

        <!-- Flight detail overlay -->
        <Teleport to="body">
          <Transition name="slide-up">
            <div v-if="selectedFlight" class="flight-sheet" @click.self="closeFlight">
              <div class="sheet-card">
                <div class="sheet-head">
                  <div class="sheet-title">{{ driverFlightRoute(selectedFlight) }}</div>
                  <button class="sheet-close" @click="closeFlight"><span class="ms">close</span></button>
                </div>
                <div class="sheet-meta">
                  <span class="mi"><span class="ms gi">calendar_today</span>{{ driverFlightDate(selectedFlight) }}</span>
                  <span class="mi"><span class="ms gi">schedule</span>{{ driverFlightTime(selectedFlight) }}</span>
                </div>
                <div class="sheet-row">
                  <span class="label">Статус</span>
                  <span class="chip" :style="{ background: flightStatusStyle(selectedFlight.status).bg, color: flightStatusStyle(selectedFlight.status).color }">
                    {{ FLIGHT_STATUS_LABEL[selectedFlight.status] }}
                  </span>
                </div>
                <div class="sheet-row">
                  <span class="label">Оплата</span>
                  <span class="chip" :style="{ background: paymentStatusStyle(selectedFlight.paymentStatus).bg, color: paymentStatusStyle(selectedFlight.paymentStatus).color }">
                    {{ PAYMENT_STATUS_LABEL[selectedFlight.paymentStatus] }}
                  </span>
                </div>
                <div v-if="selectedFlight.car" class="sheet-row">
                  <span class="label">Авто</span>
                  <span>{{ selectedFlight.car.model }} · {{ selectedFlight.car.plate }}</span>
                </div>
                <div v-if="selectedFlight.pickupAddress" class="sheet-row">
                  <span class="label">Подача</span>
                  <span>{{ selectedFlight.pickupAddress }}</span>
                </div>
                <div v-if="selectedFlight.dropoffAddress" class="sheet-row">
                  <span class="label">Высадка</span>
                  <span>{{ selectedFlight.dropoffAddress }}</span>
                </div>

                <!-- Passengers -->
                <div class="pass-title">
                  Пассажиры
                  <span class="pass-count">Броней: {{ selectedFlight.passengers.length }} · Занято мест: {{ selectedFlight.seatsTaken }} / {{ selectedFlight.seatsTotal }}</span>
                </div>
                <div v-if="selectedFlight.passengers.length === 0" class="pass-empty">Бронирований нет</div>
                <div v-else class="pass-list">
                  <div v-for="p in selectedFlight.passengers" :key="p.bookingId" class="pass-block">
                    <div class="pass-row">
                      <span class="pass-avatar">{{ (p.name[0] ?? '?').toUpperCase() }}</span>
                      <span class="pass-name">{{ p.name }}</span>
                      <button v-if="p.phone" class="pass-ic pass-ic--call" @click="callPassenger(p)" aria-label="Позвонить пассажиру">
                        <span class="ms">call</span>
                      </button>
                      <button v-if="p.phone && p.whatsapp" class="pass-ic pass-ic--wa" @click="whatsappPassenger(p)" aria-label="Написать в WhatsApp">
                        <span class="ms">chat</span>
                      </button>
                      <span class="chip" :style="{ background: paymentStatusStyle(p.paymentStatus).bg, color: paymentStatusStyle(p.paymentStatus).color }">
                        {{ PAYMENT_STATUS_LABEL[p.paymentStatus] }}
                      </span>
                    </div>
                    <!-- Pickup/dropoff points: where to collect/drop this passenger -->
                    <div v-if="p.stops?.length" class="stop-list">
                      <button
                        v-for="s in p.stops"
                        :key="s.id"
                        class="stop-item"
                        :disabled="stopBusy === s.id"
                        @click="toggleStopPicked(selectedFlight.id, p.bookingId, s)"
                      >
                        <span :class="['stop-check ms', s.pickedUp && 'stop-check--on']">
                          {{ s.pickedUp ? 'check_box' : 'check_box_outline_blank' }}
                        </span>
                        <span class="stop-body">
                          <span class="stop-addr" :class="s.pickedUp && 'stop-addr--done'">{{ s.address }}</span>
                          <span class="stop-sub">
                            {{ STOP_KIND_LABEL[s.kind] }}<template v-if="s.note"> · {{ s.note }}</template>
                            <template v-if="s.price != null"> · {{ formatMoney(s.price) }}</template>
                          </span>
                        </span>
                      </button>
                    </div>
                    <div class="pass-pay">
                      <span class="pass-sum">
                        <span class="pass-metric">
                          <span class="pass-metric-label">Внесено</span>
                          <span class="pass-metric-val">{{ formatMoney(p.prepaid) }}</span>
                        </span>
                        <span class="pass-metric">
                          <span class="pass-metric-label">Итого</span>
                          <span class="pass-metric-val">{{ formatMoney(p.total) }}</span>
                        </span>
                        <span class="pass-metric">
                          <span class="pass-metric-label">Мест</span>
                          <span class="pass-metric-val">{{ p.pax }}</span>
                        </span>
                      </span>
                      <button
                        v-if="p.paymentStatus !== 'PAID'"
                        class="pay-mini"
                        :disabled="paymentBusy === p.bookingId"
                        @click="markBookingPaid(selectedFlight.id, p.bookingId, 'PAID')"
                      >
                        {{ paymentBusy === p.bookingId ? '…' : 'Оплачено' }}
                      </button>
                      <button
                        v-else
                        class="pay-mini pay-mini--off"
                        :disabled="paymentBusy === p.bookingId"
                        @click="markBookingPaid(selectedFlight.id, p.bookingId, 'UNPAID')"
                      >
                        {{ paymentBusy === p.bookingId ? '…' : 'Снять' }}
                      </button>
                    </div>
                  </div>
                </div>

                <ErrorBanner v-if="paymentError" :message="paymentError" style="margin-top: 12px" />
                <ErrorBanner v-if="statusChangeError" :message="statusChangeError" style="margin-top: 12px" />

                <!-- Flight actions -->
                <div class="flight-actions">
                  <!-- Mark the whole flight paid -->
                  <button
                    v-if="selectedFlight.passengers.length && selectedFlight.paymentStatus !== 'PAID'"
                    class="status-btn pay-all"
                    :disabled="paymentBusy === selectedFlight.id"
                    @click="markFlightPaid(selectedFlight.id, 'PAID')"
                  >
                    <span class="ms">payments</span>
                    {{ paymentBusy === selectedFlight.id ? 'Обновляем…' : 'Весь рейс оплачен' }}
                  </button>

                  <!-- Status action -->
                  <button
                    v-if="nextStatus(selectedFlight)"
                    class="status-btn status-next"
                    :disabled="statusChanging === selectedFlight.id"
                    @click="changeFlightStatus(selectedFlight.id, nextStatus(selectedFlight)!)"
                  >
                    <span class="ms">{{ nextStatus(selectedFlight) === 'DEPARTED' ? 'departure_board' : 'check_circle' }}</span>
                    {{ statusChanging === selectedFlight.id ? 'Обновляем…' : nextStatusLabel[nextStatus(selectedFlight)!] }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </template>

      <!-- ── CLIENT CABINET ── -->
      <template v-else>
        <div class="profile">
          <div class="avatar">{{ initials(auth.client?.name ?? '') }}</div>
          <div class="profile-main">
            <div class="profile-name">{{ auth.client?.name }}</div>
            <div class="profile-phone">{{ auth.client?.phone }}</div>
          </div>

          <!-- Menu button + dropdown -->
          <div ref="menuWrapEl" class="menu-wrap">
            <button class="menu-btn" @click.stop="toggleMenu">
              <span class="ms">more_vert</span>
            </button>
            <Transition name="drop">
              <div v-if="menuOpen" class="dropdown">
                <button class="dd-item" @click="closeMenu(); router.push('/profile')">
                  <span class="ms dd-ic">manage_accounts</span>
                  Изменить профиль
                </button>
                <div class="dd-divider" />
                <button class="dd-item dd-item--red" @click="closeMenu(); logout()">
                  <span class="ms dd-ic">logout</span>
                  Выйти
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <div class="tabs">
          <button :class="['seg', activeTab === 'upcoming' && 'seg--on']" @click="activeTab = 'upcoming'">Предстоящие</button>
          <button :class="['seg', activeTab === 'history' && 'seg--on']" @click="activeTab = 'history'">История</button>
        </div>

        <BookingCardSkeleton v-if="loading" />
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
              <span class="foot-left">
                <span class="total">{{ formatMoney(b.total) }}</span>
                <span class="chip" :style="{ background: paymentStatusStyle(b.paymentStatus).bg, color: paymentStatusStyle(b.paymentStatus).color }">
                  {{ PAYMENT_STATUS_LABEL[b.paymentStatus] }}
                </span>
              </span>
              <span class="more">Подробнее<span class="ms" style="font-size: 16px">chevron_right</span></span>
            </div>
          </button>

          <div v-if="shown.length === 0" class="empty">
            <span class="ms empty-ic">receipt_long</span>
            <div class="empty-text">{{ activeTab === 'upcoming' ? 'Предстоящих поездок нет' : 'История поездок пуста' }}</div>
          </div>
        </div>

        <!-- Custom ("leave a request") orders -->
        <template v-if="!loading && customRequests.length">
          <div class="section-label">Мои индивидуальные заявки</div>
          <div class="list">
            <div v-for="r in customRequests" :key="r.id" class="card card--static">
              <div class="card-head">
                <div class="card-route">{{ customRouteTitle(r) }}</div>
                <span class="chip" :style="{ background: customStatusStyle(r.status).bg, color: customStatusStyle(r.status).color }">
                  {{ APPLICATION_STATUS_LABEL[r.status] }}
                </span>
              </div>
              <div class="card-meta">
                <span class="mi"><span class="ms gi">calendar_today</span>{{ customDateLabel(r) }}</span>
                <span class="mi"><span class="ms gi">group</span>{{ r.pax }}</span>
                <span v-if="r.carType" class="mi"><span class="ms gi">directions_car</span>{{ CAR_TYPE_LABEL[r.carType] }}<template v-if="r.wholeCabin"> · салон</template></span>
              </div>
              <div v-if="r.comment" class="card-comment">{{ r.comment }}</div>

              <ErrorBanner v-if="customActionError && customConfirmId === r.id" :message="customActionError" style="margin-top: 10px" />

              <!-- Inline confirmation: cancelling removes the request outright -->
              <div v-if="customConfirmId === r.id" class="req-confirm">
                <div class="req-confirm-q">Отменить заявку? Её нельзя будет восстановить.</div>
                <div class="req-confirm-btns">
                  <button class="req-no" :disabled="customBusyId === r.id" @click="clearCustomConfirm">Нет</button>
                  <button class="req-yes" :disabled="customBusyId === r.id" @click="removeCustomRequest(r)">
                    {{ customBusyId === r.id ? '...' : 'Да' }}
                  </button>
                </div>
              </div>

              <!-- Withdraw (= remove) the request -->
              <div v-else class="req-actions">
                <button class="req-cancel" @click="askRemoveCustomRequest(r)">
                  <span class="ms">{{ r.status === 'REJECTED' ? 'delete' : 'cancel' }}</span>{{ removeLabel(r) }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>

      <div style="height: 40px"></div>
      </div>
    </IonContent>
  </IonPage>
</template>

<style scoped>
@media (min-width: 768px) {
  .profile { padding: 20px 0 0; }
  .tabs { padding: 18px 0 12px; }
  .list { padding: 0; }
  .guest { padding: 60px 0; }
  .perks { max-width: 400px; margin-left: auto; margin-right: auto; }
  .primary { max-width: 320px; align-self: center; }
}

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
.driver-avatar { background: #EEF0FF; color: #5060C8; }
.profile-main { flex: 1; min-width: 0; }
.profile-name { font: 800 19px 'Manrope', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.profile-phone { font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted-light); margin-top: 2px; }
.logout {
  height: 34px; padding: 0 13px; border: 1px solid #e2e5df; background: #fff; border-radius: 10px;
  font: 700 12px 'Manrope', sans-serif; color: var(--eg-muted); cursor: pointer; display: flex; align-items: center; gap: 5px;
}

/* Assigned cars */
.cars { padding: 14px 16px 0; display: flex; flex-direction: column; gap: 8px; }
.cars-label {
  font: 700 11px 'Manrope', sans-serif; color: #9fa59a; text-transform: uppercase; letter-spacing: .06em;
}
.car-item {
  display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #eceee9;
  border-radius: 13px; padding: 12px 14px; font: 600 14px 'Manrope', sans-serif; color: var(--eg-ink);
}
.car-ic { font-size: 20px; color: var(--eg-green); flex: none; }
.car-model { font-weight: 700; }
.car-plate {
  font: 700 12px 'Manrope', sans-serif; color: var(--eg-muted); background: var(--eg-bg-subtle);
  padding: 3px 8px; border-radius: 7px; letter-spacing: .03em;
}
.car-seats { margin-left: auto; font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted-light); }

/* Menu */
.menu-wrap { position: relative; flex-shrink: 0; }
.menu-btn {
  width: 38px; height: 38px; border-radius: 11px; border: 1px solid #e2e5df;
  background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 22px;
  color: var(--eg-ink);
}
.dropdown {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 50;
  background: #fff; border: 1px solid #e2e5df; border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12); min-width: 190px; overflow: hidden;
}
.dd-item {
  width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 13px 16px; background: none; border: none; cursor: pointer;
  font: 600 14px 'Manrope', sans-serif; color: var(--eg-ink); text-align: left;
}
.dd-item:hover { background: #f8f9f6; }
.dd-ic { font-size: 20px; color: var(--eg-muted); }
.dd-item--red { color: #C0492E; }
.dd-item--red .dd-ic { color: #C0492E; }
.dd-divider { height: 1px; background: #f0f1ee; margin: 0; }
.drop-enter-active { animation: dropIn .15s ease-out; }
.drop-leave-active { animation: dropIn .12s ease-in reverse; }
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-6px) scale(.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
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
.card-car { display: flex; align-items: center; gap: 5px; margin-top: 8px; font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted); }
.mi { display: flex; align-items: center; gap: 5px; }
.gi { color: var(--eg-green); font-size: 17px; }
.card-foot {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f1ee;
}
.total { font: 800 16px 'Manrope', sans-serif; }
.foot-left { display: flex; align-items: center; gap: 8px; }
.chip-stack { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.more { font: 700 12px 'Manrope', sans-serif; color: var(--eg-green); display: flex; align-items: center; gap: 3px; }

/* Custom requests section */
.section-label {
  padding: 22px 16px 10px; font: 700 11px 'Manrope', sans-serif; color: #9fa59a;
  text-transform: uppercase; letter-spacing: .06em;
}
.card--static { cursor: default; }
.card-comment {
  margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f1ee;
  font: 500 13px/1.4 'Manrope', sans-serif; color: var(--eg-muted);
}

/* Custom request actions */
.req-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.req-cancel {
  display: flex; align-items: center; gap: 5px; height: 34px; padding: 0 13px;
  border-radius: 10px; font: 700 12.5px 'Manrope', sans-serif; cursor: pointer;
  border: 1px solid #f1c9c0; background: #fcf3f1; color: #c0492e;
}
.req-cancel .ms { font-size: 17px; }
.req-confirm {
  margin-top: 12px; background: #fcf3f1; border: 1px solid #f1c9c0; border-radius: 12px; padding: 12px 14px;
}
.req-confirm-q { font: 600 13px 'Manrope', sans-serif; color: #c0492e; }
.req-confirm-btns { display: flex; gap: 8px; margin-top: 10px; }
.req-no {
  flex: 1; height: 40px; border-radius: 10px; border: 1px solid #e2e5df; background: #fff;
  color: var(--eg-ink); font: 700 13px 'Manrope', sans-serif; cursor: pointer;
}
.req-yes {
  flex: 1; height: 40px; border-radius: 10px; border: none; background: #c0492e; color: #fff;
  font: 700 13px 'Manrope', sans-serif; cursor: pointer;
}
.req-no:disabled, .req-yes:disabled { opacity: 0.6; cursor: not-allowed; }

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

/* Driver flight detail sheet */
.flight-sheet {
  position: fixed; inset: 0; background: rgba(16, 18, 20, 0.45); z-index: 200;
  display: flex; align-items: flex-end;
}
.sheet-card {
  width: 100%; min-height: 75vh; max-height: 96vh; background: #fff; border-radius: 22px 22px 0 0;
  padding: 20px 20px 0; overflow-y: auto;
  display: flex; flex-direction: column;
}
.sheet-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sheet-title { font: 800 19px 'Manrope', sans-serif; }
.sheet-close {
  width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e2e5df;
  background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.sheet-meta { display: flex; gap: 16px; font: 600 13px 'Manrope', sans-serif; color: var(--eg-muted); margin-bottom: 16px; }
.sheet-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font: 500 14px 'Manrope', sans-serif; }
.label { width: 80px; flex: none; color: var(--eg-muted-light); font: 600 12px 'Manrope', sans-serif; }
.pass-title {
  display: flex; align-items: center; justify-content: space-between;
  font: 700 13px 'Manrope', sans-serif; color: #9fa59a; text-transform: uppercase; letter-spacing: .06em;
  margin: 16px 0 10px;
}
.pass-count { font: 600 12px 'Manrope', sans-serif; color: var(--eg-muted-light); text-transform: none; letter-spacing: 0; }
.pass-empty { font: 500 13px 'Manrope', sans-serif; color: var(--eg-muted-light); padding: 8px 0; }
.pass-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
.pass-block { display: flex; flex-direction: column; gap: 6px; padding-bottom: 12px; border-bottom: 1px solid #f0f1ee; }
.pass-block:last-child { border-bottom: none; padding-bottom: 0; }
.pass-row { display: flex; align-items: center; gap: 10px; }
.pass-avatar {
  width: 34px; height: 34px; border-radius: 50%; background: var(--eg-ink); color: var(--eg-green-bright);
  display: flex; align-items: center; justify-content: center; font: 800 13px 'Manrope', sans-serif; flex: none;
}
.pass-name { flex: 1; font: 600 14px 'Manrope', sans-serif; min-width: 0; }
.pass-ic {
  width: 32px; height: 32px; border-radius: 9px; border: none; flex: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 17px;
}
.pass-ic--call { background: #EEF6E6; color: var(--eg-green); }
.pass-ic--wa { background: var(--eg-whatsapp); color: #fff; }
.pass-pay { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; padding-left: 44px; }
.pass-sum { display: flex; gap: 18px; flex-wrap: wrap; }
.pass-metric { display: flex; flex-direction: column; gap: 2px; }
.pass-metric-label {
  font: 600 10px 'Manrope', sans-serif; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--eg-muted-light);
}
.pass-metric-val { font: 700 14px 'Manrope', sans-serif; color: var(--eg-ink); }
/* Pickup/dropoff points inside a passenger block */
.stop-list { display: flex; flex-direction: column; gap: 6px; padding-left: 44px; }
.stop-item {
  display: flex; align-items: flex-start; gap: 8px; padding: 7px 10px; border: 1px solid #eceee9;
  border-radius: 11px; background: #fafbf8; cursor: pointer; text-align: left; width: 100%;
}
.stop-item:disabled { opacity: 0.6; }
.stop-check { font-size: 21px; color: #c4c8c0; flex: none; }
.stop-check--on { color: var(--eg-green); }
.stop-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.stop-addr { font: 600 13px 'Manrope', sans-serif; color: var(--eg-ink); }
.stop-addr--done { text-decoration: line-through; color: var(--eg-muted-light); }
.stop-sub { font: 500 11px 'Manrope', sans-serif; color: var(--eg-muted-light); }

.pay-mini {
  height: 32px; padding: 0 14px; border: none; border-radius: 9px;
  background: var(--eg-green); color: #fff; font: 700 12px 'Manrope', sans-serif; cursor: pointer; flex: none;
}
.pay-mini--off { background: #fff; border: 1px solid #e2e5df; color: var(--eg-muted); }
.pay-mini:disabled { opacity: 0.5; cursor: not-allowed; }
.flight-actions {
  position: sticky; bottom: 0; margin-top: auto;
  display: flex; gap: 10px; flex-wrap: wrap;
  background: #fff; padding: 12px 0 24px;
  border-top: 1px solid #f0f1ee; z-index: 2;
}
.status-btn {
  flex: 1 1 0; min-width: 140px; height: 54px; border-radius: 15px;
  font: 700 15px 'Manrope', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.status-btn:disabled { opacity: 0.5; cursor: not-allowed; }
/* "Оплачено" — secondary / outlined */
.pay-all {
  background: var(--eg-green-light, #EEF6E6); color: #3E7C12;
  border: 1.5px solid #3E7C12;
}
/* "Выехали" — primary / solid */
.status-next {
  background: var(--eg-green); color: #fff; border: none;
}

/* Backdrop fades, card slides up independently */
.slide-up-enter-active { animation: sheetFade .25s ease-out; }
.slide-up-leave-active { animation: sheetFade .2s ease-in reverse; }
.slide-up-enter-active .sheet-card { animation: slideUp .28s cubic-bezier(0.32, 0.72, 0, 1); }
.slide-up-leave-active .sheet-card { animation: slideUp .2s ease-in reverse; }
@keyframes sheetFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
</style>
