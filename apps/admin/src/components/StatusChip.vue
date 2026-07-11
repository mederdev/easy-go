<script setup lang="ts">
import { computed } from 'vue';
import {
  BOOKING_STATUS_LABEL,
  FLIGHT_STATUS_LABEL,
  ROUTE_STATUS_LABEL,
  CAR_STATUS_LABEL,
  APPLICATION_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  type BookingStatus,
  type FlightStatus,
  type RouteStatus,
  type CarStatus,
  type ApplicationStatus,
  type PaymentStatus,
} from '@easygo/shared';
import { colors } from '@easygo/ui-tokens';

type Kind = 'booking' | 'flight' | 'route' | 'car' | 'application' | 'payment';

const props = defineProps<{
  kind: Kind;
  status: BookingStatus | FlightStatus | RouteStatus | CarStatus | ApplicationStatus | PaymentStatus | string;
}>();

const GREEN = colors.statusGreen;
const BLUE = colors.statusBlue;
const GREY = colors.statusGrey;
const RED = colors.statusRed;
const AMBER = colors.statusAmber;

type Pair = readonly [string, string];

const bookingColors: Record<BookingStatus, Pair> = {
  NEW: GREEN,
  CONFIRMED: BLUE,
  COMPLETED: GREY,
  CANCELLED: RED,
  CANCELLED_BY_CLIENT: AMBER,
  CANCELLED_BY_COMPANY: RED,
};

const flightColors: Record<FlightStatus, Pair> = {
  SCHEDULED: GREEN,
  CLOSED: RED,
  DEPARTED: BLUE,
  COMPLETED: GREY,
  CANCELLED: RED,
  CANCELLED_BY_CLIENT: AMBER,
  CANCELLED_BY_COMPANY: RED,
};

const routeColors: Record<RouteStatus, Pair> = {
  ACTIVE: GREEN,
  DRAFT: GREY,
  ARCHIVED: GREY,
};

const carColors: Record<CarStatus, Pair> = {
  AVAILABLE: GREEN,
  ON_TRIP: AMBER,
  MAINTENANCE: RED,
};

const applicationColors: Record<ApplicationStatus, Pair> = {
  NEW: GREEN,
  REVIEWING: AMBER,
  ACCEPTED: BLUE,
  REJECTED: RED,
  CANCELLED: GREY,
};

const paymentColors: Record<PaymentStatus, Pair> = {
  UNPAID: RED,
  PARTIAL: AMBER,
  PAID: GREEN,
};

const label = computed<string>(() => {
  switch (props.kind) {
    case 'booking':
      return BOOKING_STATUS_LABEL[props.status as BookingStatus] ?? String(props.status);
    case 'flight':
      return FLIGHT_STATUS_LABEL[props.status as FlightStatus] ?? String(props.status);
    case 'route':
      return ROUTE_STATUS_LABEL[props.status as RouteStatus] ?? String(props.status);
    case 'car':
      return CAR_STATUS_LABEL[props.status as CarStatus] ?? String(props.status);
    case 'application':
      return APPLICATION_STATUS_LABEL[props.status as ApplicationStatus] ?? String(props.status);
    case 'payment':
      return PAYMENT_STATUS_LABEL[props.status as PaymentStatus] ?? String(props.status);
    default:
      return String(props.status);
  }
});

const pair = computed<Pair>(() => {
  switch (props.kind) {
    case 'booking':
      return bookingColors[props.status as BookingStatus] ?? GREY;
    case 'flight':
      return flightColors[props.status as FlightStatus] ?? GREY;
    case 'route':
      return routeColors[props.status as RouteStatus] ?? GREY;
    case 'car':
      return carColors[props.status as CarStatus] ?? GREY;
    case 'application':
      return applicationColors[props.status as ApplicationStatus] ?? GREY;
    case 'payment':
      return paymentColors[props.status as PaymentStatus] ?? GREY;
    default:
      return GREY;
  }
});
</script>

<template>
  <span class="chip" :style="{ background: pair[0], color: pair[1] }">{{ label }}</span>
</template>

<style scoped>
.chip {
  display: inline-block;
  padding: 4px 11px;
  border-radius: var(--eg-radius-pill);
  font: 700 11px var(--eg-font);
  white-space: nowrap;
}
</style>
