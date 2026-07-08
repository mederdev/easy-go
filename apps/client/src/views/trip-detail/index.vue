<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import TripDetailSkeleton from '@/components/TripDetailSkeleton.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { useTripDetailModel } from './model';

const {
  router,
  booking,
  loading,
  error,
  confirming,
  cancelling,
  cancelError,
  cancellable,
  dateLabel,
  timeLabel,
  doCancel,
  contactOperator,
  driver,
  callDriver,
  whatsappDriver,
  sendReceipt,
  paymentStatusStyle,
  BOOKING_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  STOP_KIND_LABEL,
  formatMoney,
  paxLabel,
  stops,
  stopsEditable,
  pax,
  canAddStop,
  stopFormOpen,
  stopForm,
  stopBusy,
  stopError,
  openAddStop,
  openEditStop,
  closeStopForm,
  saveStop,
  removeStop,
  stopPriceLabel,
  addons,
  addonPriceLabel,
} = useTripDetailModel();
</script>

<template>
  <IonPage>
    <IonContent :fullscreen="true">
      <div class="pg">
      <div class="head">
        <button class="back" @click="router.back()"><span class="ms">arrow_back</span></button>
        <div class="head-title">Поездка {{ booking?.code ?? '' }}</div>
      </div>

      <TripDetailSkeleton v-if="loading" />
      <ErrorBanner v-else-if="error" :message="error" style="margin: 0 16px" />

      <template v-else-if="booking">
        <div class="hero">
          <div class="hero-top">
            <div class="hero-route">{{ booking.flight?.route ? `${booking.flight.route.fromCity} → ${booking.flight.route.toCity}` : booking.code }}</div>
            <div class="hero-chips">
              <span class="hero-chip">{{ BOOKING_STATUS_LABEL[booking.status] }}</span>
              <span class="hero-chip" :style="{ background: paymentStatusStyle(booking.paymentStatus).bg, color: paymentStatusStyle(booking.paymentStatus).color }">
                {{ PAYMENT_STATUS_LABEL[booking.paymentStatus] }}
              </span>
            </div>
          </div>
          <div class="hero-meta">
            <div><div class="cap">Дата</div><div class="val">{{ dateLabel(booking.flight?.departAt) }}</div></div>
            <div><div class="cap">Время</div><div class="val">{{ timeLabel(booking.flight?.departAt) }}</div></div>
            <div><div class="cap">Пассажиров</div><div class="val">{{ paxLabel(booking.pax) }}</div></div>
          </div>
        </div>

        <div class="section-title">Детали</div>
        <div class="details">
          <div class="row"><span class="k">Авто</span><span class="v">{{ booking.flight?.car?.model ?? 'KIA Carnival' }}</span></div>
          <div class="div"></div>
          <div class="row"><span class="k">Подача</span><span class="v">{{ booking.flight?.pickupAddress ?? '—' }}</span></div>
          <template v-if="booking.flight?.dropoffAddress">
            <div class="div"></div>
            <div class="row"><span class="k">Высадка</span><span class="v">{{ booking.flight.dropoffAddress }}</span></div>
          </template>
          <template v-if="booking.discount > 0">
            <div class="div"></div>
            <div class="row"><span class="k">Скидка</span><span class="v">−{{ formatMoney(booking.discount) }}</span></div>
          </template>
          <template v-if="booking.prepaid > 0">
            <div class="div"></div>
            <div class="row"><span class="k">Предоплата</span><span class="v">{{ formatMoney(booking.prepaid) }}</span></div>
          </template>
          <div class="div"></div>
          <div class="row"><span class="k strong">Итого</span><span class="v total">{{ formatMoney(booking.total) }}</span></div>
        </div>

        <!-- Assigned driver: call / write on WhatsApp -->
        <template v-if="driver">
          <div class="section-title">Водитель</div>
          <div class="driver">
            <div class="driver-av"><span class="ms">person</span></div>
            <div class="driver-info">
              <div class="driver-name">{{ driver.name }}</div>
              <div v-if="driver.experience" class="driver-exp">{{ driver.experience }} опыта</div>
            </div>
            <button class="driver-ic driver-ic--call" @click="callDriver" aria-label="Позвонить водителю">
              <span class="ms">call</span>
            </button>
            <button class="driver-ic driver-ic--wa" @click="whatsappDriver" aria-label="Написать водителю в WhatsApp">
              <span class="ms">chat</span>
            </button>
          </div>
        </template>

        <!-- Pickup / dropoff points -->
        <div class="section-title">Точки сбора и развоза</div>
        <div class="details">
          <div v-if="stops.length === 0" class="stops-empty">
            Точек пока нет{{ stopsEditable ? ' — добавьте адрес, откуда вас забрать или куда развезти.' : '.' }}
          </div>
          <template v-for="(s, i) in stops" :key="s.id">
            <div v-if="i > 0" class="div"></div>
            <div class="stop-line">
              <span :class="['stop-tag', s.kind === 'DROPOFF' && 'stop-tag--drop']">{{ STOP_KIND_LABEL[s.kind] }}</span>
              <span class="stop-addr">
                {{ s.address }}
                <span v-if="s.note" class="stop-note-text">{{ s.note }}</span>
              </span>
              <span :class="['stop-price', s.price == null && 'stop-price--pending']">{{ stopPriceLabel(s) }}</span>
              <template v-if="stopsEditable">
                <button class="stop-ic" :disabled="stopBusy" @click="openEditStop(s)"><span class="ms">edit</span></button>
                <button class="stop-ic stop-ic--del" :disabled="stopBusy" @click="removeStop(s)"><span class="ms">delete</span></button>
              </template>
            </div>
          </template>
        </div>

        <ErrorBanner v-if="stopError && !stopFormOpen" :message="stopError" style="margin: 10px 16px 0" />

        <button v-if="canAddStop && !stopFormOpen" class="stop-add" @click="openAddStop">
          <span class="ms">add_location_alt</span>Добавить точку
        </button>
        <div
          v-else-if="stopsEditable && !stopFormOpen && !canAddStop && stops.length"
          class="stop-limit"
        >
          Максимум {{ pax }} точек сбора и {{ pax }} развоза — по одной каждого типа на пассажира.
        </div>

        <!-- Inline add/edit form -->
        <div v-if="stopFormOpen" class="stop-form">
          <div class="stop-form-title">{{ stopForm.id ? 'Изменить точку' : 'Новая точка' }}</div>
          <div class="stop-kind">
            <button
              type="button"
              :class="['stop-kind-btn', stopForm.kind === 'PICKUP' && 'stop-kind-btn--on']"
              @click="stopForm.kind = 'PICKUP'"
            >Сбор</button>
            <button
              type="button"
              :class="['stop-kind-btn', stopForm.kind === 'DROPOFF' && 'stop-kind-btn--on']"
              @click="stopForm.kind = 'DROPOFF'"
            >Развоз</button>
          </div>
          <input
            v-model="stopForm.address"
            class="stop-input"
            type="text"
            :placeholder="stopForm.kind === 'PICKUP' ? 'Адрес, откуда забрать' : 'Адрес, куда отвезти'"
          />
          <input v-model="stopForm.note" class="stop-input" type="text" placeholder="Примечание (необязательно)" />
          <div class="stop-form-hint">
            За каждую точку взимается доплата — цену подтвердит оператор.
            {{ stopForm.id ? 'При изменении адреса цена сбрасывается до подтверждения.' : '' }}
          </div>
          <ErrorBanner v-if="stopError" :message="stopError" />
          <div class="stop-form-btns">
            <button class="stop-cancel" :disabled="stopBusy" @click="closeStopForm">Отмена</button>
            <button class="stop-save" :disabled="stopBusy" @click="saveStop">{{ stopBusy ? 'Сохранение…' : 'Сохранить' }}</button>
          </div>
        </div>

        <!-- Доп. услуги (read-only): attached by the operator, priced into the total -->
        <template v-if="addons.length">
          <div class="section-title">Доп. услуги</div>
          <div class="details">
            <template v-for="(a, i) in addons" :key="a.id">
              <div v-if="i > 0" class="div"></div>
              <div class="stop-line">
                <span class="stop-addr">{{ a.name }}</span>
                <span class="stop-price">{{ addonPriceLabel(a) }}</span>
              </div>
            </template>
          </div>
        </template>

        <button class="wa" @click="contactOperator"><span class="ms">chat</span>Связаться с оператором</button>
        <button v-if="booking.paymentStatus !== 'PAID'" class="receipt" @click="sendReceipt">
          <span class="ms">receipt_long</span>Отправить чек админу
        </button>

        <template v-if="cancellable">
          <ErrorBanner v-if="cancelError" :message="cancelError" style="margin: 12px 16px 0" />
          <button v-if="!confirming" class="cancel" @click="confirming = true">
            <span class="ms">cancel</span>Отменить бронь
          </button>
          <div v-else class="confirm">
            <div class="confirm-q">Отменить бронь? Место вернётся в продажу.</div>
            <div class="confirm-btns">
              <button class="confirm-no" :disabled="cancelling" @click="confirming = false">Нет</button>
              <button class="confirm-yes" :disabled="cancelling" @click="doCancel">{{ cancelling ? 'Отмена…' : 'Да, отменить' }}</button>
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
  .head { padding: 20px 0 12px; }
  .hero { margin: 0; }
  .details { margin: 0; }
  .driver { margin: 0; }
  .wa { width: 100%; margin: 18px 0 0; }
  .cancel { width: 100%; margin: 10px 0 0; }
  .confirm { margin: 10px 0 0; }
}

.head { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
.back {
  width: 38px; height: 38px; border-radius: 11px; border: 1px solid #e7e9e5; background: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 21px;
}
.head-title { font: 800 18px 'Manrope', sans-serif; }
.hero { margin: 0 16px; background: var(--eg-ink); border-radius: 18px; padding: 16px 18px; color: #fff; }
.hero-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.hero-route { font: 800 18px 'Manrope', sans-serif; }
.hero-chips { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex: none; }
.hero-chip {
  padding: 5px 11px; border-radius: 999px; background: rgba(86, 169, 25, 0.2);
  color: var(--eg-green-bright); font: 700 11px 'Manrope', sans-serif; white-space: nowrap;
}
.hero-meta { display: flex; gap: 18px; margin-top: 12px; }
.cap { font: 600 10px 'Manrope', sans-serif; color: #8b918a; text-transform: uppercase; }
.val { font: 700 14px 'Manrope', sans-serif; color: #fff; margin-top: 2px; }
.section-title { padding: 18px 16px 6px; font: 800 14px 'Manrope', sans-serif; }
.details { margin: 0 16px; background: #fff; border: 1px solid #eceee9; border-radius: 16px; padding: 6px 16px; }
.row { display: flex; justify-content: space-between; padding: 11px 0; }
.k { font: 600 13px 'Manrope', sans-serif; color: var(--eg-muted-light); }
.k.strong { font: 700 14px 'Manrope', sans-serif; color: var(--eg-ink); }
.v { font: 700 13px 'Manrope', sans-serif; }
.v.total { font: 800 18px 'Manrope', sans-serif; color: var(--eg-green); }
.div { height: 1px; background: #eef0ec; }
.wa {
  display: flex; align-items: center; justify-content: center; gap: 9px; width: calc(100% - 32px);
  margin: 18px 16px 0; height: 52px; border: none; border-radius: 14px; background: var(--eg-whatsapp);
  color: #fff; font: 700 15px 'Manrope', sans-serif; cursor: pointer;
}
.receipt {
  display: flex; align-items: center; justify-content: center; gap: 9px; width: calc(100% - 32px);
  margin: 10px 16px 0; height: 52px; border: 1px solid #e2e5df; background: #fff;
  color: var(--eg-ink); font: 700 15px 'Manrope', sans-serif; cursor: pointer; border-radius: 14px;
}
.cancel {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: calc(100% - 32px);
  margin: 10px 16px 0; height: 52px; border: 1px solid #f1c9c0; background: #fcf3f1;
  color: #c0492e; font: 700 15px 'Manrope', sans-serif; cursor: pointer; border-radius: 14px;
}
.confirm { margin: 10px 16px 0; background: #fcf3f1; border: 1px solid #f1c9c0; border-radius: 14px; padding: 14px 16px; }
.confirm-q { font: 600 13px 'Manrope', sans-serif; color: #c0492e; }
.confirm-btns { display: flex; gap: 10px; margin-top: 12px; }
.confirm-no {
  flex: 1; height: 44px; border-radius: 11px; border: 1px solid #e2e5df; background: #fff;
  color: var(--eg-ink); font: 700 14px 'Manrope', sans-serif; cursor: pointer;
}
.confirm-yes {
  flex: 1; height: 44px; border-radius: 11px; border: none; background: #c0492e; color: #fff;
  font: 700 14px 'Manrope', sans-serif; cursor: pointer;
}
.confirm-yes:disabled, .confirm-no:disabled { opacity: 0.6; }

/* ── Assigned driver ── */
.driver {
  margin: 0 16px; background: #fff; border: 1px solid #eceee9; border-radius: 16px;
  padding: 12px 14px; display: flex; align-items: center; gap: 12px;
}
.driver-av {
  width: 44px; height: 44px; border-radius: 50%; background: #EEF0FF; color: #5060C8;
  display: flex; align-items: center; justify-content: center; flex: none;
}
.driver-av .ms { font-size: 24px; }
.driver-info { flex: 1; min-width: 0; }
.driver-name { font: 700 15px 'Manrope', sans-serif; }
.driver-exp {
  font: 500 12px 'Manrope', sans-serif; color: var(--eg-muted-light); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.driver-ic {
  width: 42px; height: 42px; border-radius: 12px; border: none; flex: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.driver-ic--call { background: #EEF6E6; color: var(--eg-green); }
.driver-ic--wa { background: var(--eg-whatsapp); color: #fff; }

/* ── Pickup/dropoff points ── */
.stops-empty { padding: 12px 0; font: 500 13px 'Manrope', sans-serif; color: var(--eg-muted-light); }
.stop-line { display: flex; align-items: center; gap: 8px; padding: 11px 0; }
.stop-tag {
  padding: 3px 9px; border-radius: 999px; background: #EEF6E6; color: #3E7C12;
  font: 700 11px 'Manrope', sans-serif; flex: none;
}
.stop-tag--drop { background: #EEF0FF; color: #5060C8; }
.stop-addr { flex: 1; min-width: 0; font: 600 13px 'Manrope', sans-serif; display: flex; flex-direction: column; gap: 2px; }
.stop-note-text { font: 500 12px 'Manrope', sans-serif; color: var(--eg-muted-light); }
.stop-price { font: 700 13px 'Manrope', sans-serif; color: var(--eg-green); flex: none; }
.stop-price--pending { color: #C77A18; font-weight: 600; font-size: 12px; }
.stop-ic {
  width: 32px; height: 32px; border-radius: 9px; border: 1px solid #e7e9e5; background: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex: none;
  color: var(--eg-muted);
}
.stop-ic--del { color: #C0492E; }
.stop-ic:disabled { opacity: 0.5; }
.stop-add {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: calc(100% - 32px);
  margin: 10px 16px 0; height: 48px; border: 1.5px dashed #C9D6BC; background: #F7FAF3;
  color: var(--eg-green); font: 700 14px 'Manrope', sans-serif; cursor: pointer; border-radius: 12px;
}
.stop-add .ms { font-size: 20px; }
.stop-form {
  margin: 10px 16px 0; background: #fff; border: 1px solid #eceee9; border-radius: 16px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
}
.stop-form-title { font: 800 14px 'Manrope', sans-serif; }
.stop-kind { display: flex; gap: 8px; }
.stop-kind-btn {
  flex: 1; padding: 9px 12px; border-radius: 11px; border: 1.5px solid #E7E9E5; background: #fff;
  cursor: pointer; font: 700 13px 'Manrope', sans-serif; color: var(--eg-muted);
}
.stop-kind-btn--on { border-color: var(--eg-green); background: #EEF6E6; color: var(--eg-green); }
.stop-input {
  width: 100%; height: 46px; padding: 0 13px; border: 1px solid #E2E5DF; border-radius: 11px;
  font: 500 14px 'Manrope', sans-serif; outline: none; background: #fff;
}
.stop-input:focus { border-color: var(--eg-green); }
.stop-form-hint { font: 500 12px/1.5 'Manrope', sans-serif; color: var(--eg-muted); }
.stop-form-btns { display: flex; gap: 10px; }
.stop-cancel {
  flex: 1; height: 44px; border-radius: 11px; border: 1px solid #e2e5df; background: #fff;
  color: var(--eg-ink); font: 700 14px 'Manrope', sans-serif; cursor: pointer;
}
.stop-save {
  flex: 1; height: 44px; border-radius: 11px; border: none; background: var(--eg-green); color: #fff;
  font: 700 14px 'Manrope', sans-serif; cursor: pointer;
}
.stop-save:disabled, .stop-cancel:disabled { opacity: 0.6; }

@media (min-width: 768px) {
  .stop-add, .stop-form { margin-left: 0; margin-right: 0; width: 100%; }
}
</style>
