<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <button class="back-btn" type="button" aria-label="Назад" @click="router.back()">
    <span class="ms">arrow_back</span>
  </button>
</template>

<style scoped>
.back-btn {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  border: 1px solid #e7e9e5;
  background: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  color: var(--eg-ink);
}
</style>
