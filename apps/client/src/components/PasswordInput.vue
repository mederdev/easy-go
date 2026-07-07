<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ modelValue: string }>();
defineEmits<{ (e: 'update:modelValue', value: string): void }>();
defineOptions({ inheritAttrs: false });

const visible = ref(false);
</script>

<template>
  <div class="pw-field">
    <input
      class="input"
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      class="pw-toggle"
      :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'"
      @click="visible = !visible"
    >
      <svg
        v-if="visible"
        viewBox="0 0 24 24" width="22" height="22" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
        <path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.4 9.4 0 0 0 4.2-1" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24" width="22" height="22" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.pw-field { position: relative; }
.input {
  width: 100%; height: 56px; padding: 0 48px 0 14px; border: 1px solid #e2e5df; border-radius: 14px;
  font: 600 16px 'Manrope', sans-serif; color: var(--eg-ink); outline: none; background: #fff;
  box-sizing: border-box;
}
.input:focus { border-color: var(--eg-green); }
.pw-toggle {
  position: absolute; top: 0; right: 0; height: 56px; width: 48px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer; color: var(--eg-muted-light);
}
.pw-toggle svg { display: block; }
</style>
