<script setup lang="ts">
/**
 * Loading placeholder for a list of RouteCard.vue (home — popular routes).
 */
import Skeleton from '@/components/Skeleton.vue';

withDefaults(defineProps<{ count?: number }>(), { count: 3 });
</script>

<template>
  <div v-for="n in count" :key="n" class="route-skeleton">
    <Skeleton width="42px" height="42px" radius="12px" />
    <div class="route-skeleton__info">
      <Skeleton width="60%" height="15px" radius="5px" />
      <Skeleton width="40%" height="12px" radius="4px" />
    </div>
    <div class="route-skeleton__price">
      <Skeleton width="56px" height="15px" radius="5px" />
      <Skeleton width="38px" height="11px" radius="4px" />
    </div>
  </div>
</template>

<style scoped>
.route-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  padding: 14px;
}

.route-skeleton__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.route-skeleton__price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex-shrink: 0;
}
</style>
