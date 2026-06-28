<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { api } from '@/lib/api';

const props = defineProps<{
  modelValue: string;
  label: string;
  icon: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
}>();

const suggestions = ref<string[]>([]);
const open = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Local copy so the input stays responsive while the user types; the store
// gets the value only after the debounce fires (or on explicit city select).
const localValue = ref(props.modelValue);

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  localValue.value = val;

  if (debounceTimer) clearTimeout(debounceTimer);

  if (val.trim().length < 2) {
    suggestions.value = [];
    open.value = false;
    // Still propagate the cleared/short value so the store doesn't lag behind.
    emit('update:modelValue', val);
    return;
  }

  debounceTimer = setTimeout(async () => {
    emit('update:modelValue', val);
    try {
      suggestions.value = await api.cities.search(val.trim());
      open.value = suggestions.value.length > 0;
    } catch {
      suggestions.value = [];
      open.value = false;
    }
  }, 500);
}

function select(city: string) {
  emit('update:modelValue', city);
  suggestions.value = [];
  open.value = false;
  inputRef.value?.blur();
}

function onBlur() {
  // Delay to allow click on suggestion to fire first.
  setTimeout(() => { open.value = false; }, 150);
}

// Sync local value when parent changes it externally (e.g. city swap).
watch(() => props.modelValue, (v) => {
  if (v !== localValue.value) localValue.value = v;
});

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="city-input">
    <span class="ms city-input__icon" :class="{ 'city-input__icon--green': icon === 'trip_origin' }">
      {{ icon }}
    </span>
    <div class="city-input__body">
      <label class="city-input__label" :for="label">{{ label }}</label>
      <input
        :id="label"
        ref="inputRef"
        class="city-input__field"
        type="text"
        :value="localValue"
        :placeholder="placeholder"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        @input="onInput"
        @blur="onBlur"
      />
    </div>

    <Transition name="drop">
      <ul v-if="open" class="city-input__dropdown">
        <li
          v-for="city in suggestions"
          :key="city"
          class="city-input__option"
          @mousedown.prevent="select(city)"
        >
          <span class="ms city-input__opt-icon">location_on</span>
          {{ city }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.city-input {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px 13px 14px;
  width: 100%;
}

.city-input__icon {
  font-size: 20px;
  color: var(--eg-ink);
  flex-shrink: 0;
}

.city-input__icon--green {
  color: var(--eg-green);
}

.city-input__body {
  flex: 1;
  min-width: 0;
}

.city-input__label {
  display: block;
  font: 600 11px 'Manrope', sans-serif;
  color: var(--eg-muted-light);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.city-input__field {
  width: 100%;
  margin-top: 1px;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  font: 700 16px 'Manrope', sans-serif;
  color: var(--eg-ink);
}

.city-input__field::placeholder {
  color: var(--eg-muted-light);
  font-weight: 600;
}

/* Dropdown */
.city-input__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
  border: 1px solid #ECEEE9;
  border-radius: 16px;
  box-shadow: 0 12px 32px -8px rgba(20, 30, 10, 0.18);
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow: hidden;
}

.city-input__option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  font: 600 15px 'Manrope', sans-serif;
  color: var(--eg-ink);
  cursor: pointer;
  transition: background 0.1s;
}

.city-input__option:active,
.city-input__option:hover {
  background: var(--eg-bg-subtle, #EEF6E6);
}

.city-input__opt-icon {
  font-size: 18px;
  color: var(--eg-green);
}

/* Transition */
.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
