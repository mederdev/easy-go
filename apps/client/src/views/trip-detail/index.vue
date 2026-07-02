<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
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
  sendReceipt,
  paymentStatusStyle,
  BOOKING_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  formatMoney,
  paxLabel,
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

      <LoadingSpinner v-if="loading" label="Загружаем…" />
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
</style>
