<script setup lang="ts">
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{ modelValue: string; variant?: 'default' | 'login' | 'create' }>(),
  { variant: 'default' },
);
defineEmits<{ (e: 'update:modelValue', value: string): void }>();
defineOptions({ inheritAttrs: false });

const visible = ref(false);
const inputClass = computed(() => [
  'pw-input',
  props.variant !== 'default' && `pw-input--${props.variant}`,
]);
</script>

<template>
  <div class="pw-wrap">
    <input
      :class="inputClass"
      :type="visible ? 'text' : 'password'"
      :value="modelValue"
      v-bind="$attrs"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      class="pw-eye"
      :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'"
      @click="visible = !visible"
    >
      <svg
        v-if="visible"
        viewBox="0 0 24 24" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
        <path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.4 9.4 0 0 0 4.2-1" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24" width="20" height="20" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.pw-wrap { position: relative; display: block; }
.pw-input {
  width: 100%; box-sizing: border-box;
  height: 44px; padding: 0 42px 0 12px; border: 1px solid #e2e5df; border-radius: 11px;
  font: 500 14px var(--eg-font); outline: none; background: #fff;
}
.pw-input--login { height: 48px; border-color: var(--eg-border); border-radius: 12px; font-weight: 600; }
.pw-input--create { height: 46px; border-color: var(--eg-border); border-radius: 11px; font-weight: 600; }
.pw-input:focus { border-color: var(--eg-brand); }
.pw-eye {
  position: absolute; top: 0; right: 0; height: 100%; width: 40px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer; color: var(--eg-hint);
}
.pw-eye svg { display: block; }
</style>
