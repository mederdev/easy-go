<script setup lang="ts">
/**
 * Loading placeholder for the trip-detail screen: dark hero card + a details
 * card of key/value rows. Single record, so no `count`.
 */
import Skeleton from '@/components/Skeleton.vue';
</script>

<template>
  <div class="trip-detail-skeleton">
    <!-- Hero (dark) -->
    <div class="trip-detail-skeleton__hero">
      <div class="trip-detail-skeleton__hero-top">
        <Skeleton width="55%" height="18px" radius="6px" />
        <Skeleton width="72px" height="22px" radius="999px" />
      </div>
      <div class="trip-detail-skeleton__hero-meta">
        <Skeleton v-for="n in 3" :key="n" width="60px" height="34px" radius="8px" />
      </div>
    </div>

    <!-- Details card -->
    <div class="trip-detail-skeleton__card">
      <div v-for="n in 4" :key="n" class="trip-detail-skeleton__row">
        <Skeleton width="70px" height="14px" radius="5px" />
        <Skeleton width="110px" height="14px" radius="5px" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.trip-detail-skeleton {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.trip-detail-skeleton__hero {
  margin: 0 16px;
  background: var(--eg-ink);
  border-radius: 18px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  /* lighter placeholder bars read better on the dark hero */
  --eg-skeleton-base: rgba(255, 255, 255, 0.16);
  --eg-skeleton-shine: rgba(255, 255, 255, 0.28);
}

.trip-detail-skeleton__hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.trip-detail-skeleton__hero-meta {
  display: flex;
  gap: 14px;
}

.trip-detail-skeleton__card {
  margin: 0 16px;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 6px 16px;
}

.trip-detail-skeleton__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #F1F3EF;
}

.trip-detail-skeleton__row:last-child {
  border-bottom: none;
}
</style>
