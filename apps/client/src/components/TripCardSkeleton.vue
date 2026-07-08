<script setup lang="ts">
/**
 * Loading placeholder for a list of TripCard.vue — same box, same rhythm.
 * Renders `count` shimmer cards while flights are being fetched.
 */
import Skeleton from '@/components/Skeleton.vue';

withDefaults(defineProps<{ count?: number }>(), { count: 4 });
</script>

<template>
  <div class="trip-skeleton-list">
    <div v-for="n in count" :key="n" class="trip-skeleton">
      <div class="trip-skeleton__time">
        <Skeleton width="44px" height="20px" radius="6px" />
        <Skeleton width="36px" height="9px" radius="4px" />
      </div>
      <div class="trip-skeleton__divider"></div>
      <div class="trip-skeleton__middle">
        <Skeleton width="90px" height="22px" radius="999px" />
        <Skeleton width="70%" height="12px" radius="4px" />
      </div>
      <div class="trip-skeleton__right">
        <Skeleton width="64px" height="18px" radius="6px" />
        <Skeleton width="72px" height="36px" radius="10px" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.trip-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trip-skeleton {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 14px 16px;
}

.trip-skeleton__time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.trip-skeleton__divider {
  width: 1px;
  align-self: stretch;
  background: #EEF0EC;
  flex-shrink: 0;
}

.trip-skeleton__middle {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.trip-skeleton__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}
</style>
