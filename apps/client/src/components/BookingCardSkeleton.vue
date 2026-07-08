<script setup lang="ts">
/**
 * Loading placeholder for the cabinet `.card` lists — passenger bookings and
 * driver flights share the same shape (route + status chip, meta row, footer).
 */
import Skeleton from '@/components/Skeleton.vue';

withDefaults(defineProps<{ count?: number }>(), { count: 3 });
</script>

<template>
  <div class="booking-skeleton-list">
    <div v-for="n in count" :key="n" class="booking-skeleton">
      <div class="booking-skeleton__head">
        <Skeleton width="55%" height="16px" radius="5px" />
        <Skeleton width="80px" height="22px" radius="999px" />
      </div>
      <div class="booking-skeleton__meta">
        <Skeleton width="88px" height="13px" radius="4px" />
        <Skeleton width="60px" height="13px" radius="4px" />
        <Skeleton width="44px" height="13px" radius="4px" />
      </div>
      <div class="booking-skeleton__foot">
        <Skeleton width="96px" height="14px" radius="5px" />
        <Skeleton width="78px" height="14px" radius="5px" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.booking-skeleton-list {
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.booking-skeleton {
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 15px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.booking-skeleton__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.booking-skeleton__meta {
  display: flex;
  align-items: center;
  gap: 14px;
}

.booking-skeleton__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
