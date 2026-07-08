<script setup lang="ts">
/**
 * Loading placeholder for the availability screen — city cards each holding a
 * couple of free-car rows.
 */
import Skeleton from '@/components/Skeleton.vue';

withDefaults(defineProps<{ count?: number; carsPerCity?: number }>(), {
  count: 2,
  carsPerCity: 2,
});
</script>

<template>
  <div
    v-for="n in count"
    :key="n"
    class="avail-skeleton-card"
  >
    <div class="avail-skeleton-header">
      <Skeleton width="40%" height="18px" radius="6px" />
      <Skeleton width="70px" height="22px" radius="999px" />
    </div>
    <div
      v-for="c in carsPerCity"
      :key="c"
      class="avail-skeleton-car"
    >
      <Skeleton width="44px" height="44px" radius="12px" />
      <div class="avail-skeleton-car__info">
        <Skeleton width="55%" height="14px" radius="5px" />
        <Skeleton width="35%" height="12px" radius="4px" />
      </div>
      <Skeleton width="34px" height="30px" radius="6px" />
    </div>
  </div>
</template>

<style scoped>
.avail-skeleton-card {
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 18px;
  padding: 16px 18px;
}

.avail-skeleton-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.avail-skeleton-car {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px;
  background: var(--eg-bg-subtle);
  border-radius: 13px;
}

.avail-skeleton-car__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
</style>
