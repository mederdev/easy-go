<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { api } from '@/lib/api';

/** Form input with live city suggestions from /cities/search (same API the
 *  client app's search widget uses). Free text is allowed — the suggestions
 *  are a convenience, not a constraint. */
const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
}>();

const suggestions = ref<string[]>([]);
const open = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Local copy so the input stays responsive while the user types; the parent
// gets the value only after the debounce fires (or on explicit city select).
const localValue = ref(props.modelValue);

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  localValue.value = val;

  if (debounceTimer) clearTimeout(debounceTimer);

  if (val.trim().length < 2) {
    suggestions.value = [];
    open.value = false;
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
  }, 400);
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

// Sync local value when the parent changes it externally (edit modal prefill).
watch(() => props.modelValue, (v) => {
  if (v !== localValue.value) localValue.value = v;
});

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="city-search">
    <input
      ref="inputRef"
      class="city-search__field"
      type="text"
      :value="localValue"
      :placeholder="placeholder"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      @input="onInput"
      @blur="onBlur"
    />
    <Transition name="drop">
      <ul v-if="open" class="city-search__dropdown">
        <li
          v-for="city in suggestions"
          :key="city"
          class="city-search__option"
          @mousedown.prevent="select(city)"
        >
          <span class="material-symbols-outlined city-search__opt-icon">location_on</span>
          {{ city }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.city-search {
  position: relative;
}

/* Mirrors the admin form input look (see routes/index.vue field styles). */
.city-search__field {
  width: 100%;
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--eg-border);
  border-radius: 11px;
  font: 600 14px var(--eg-font);
  outline: none;
  background: #fff;
  box-sizing: border-box;
}

.city-search__field:focus {
  border-color: var(--eg-brand);
}

.city-search__field::placeholder {
  color: var(--eg-hint);
  font-weight: 500;
}

.city-search__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 60;
  background: #fff;
  border: 1px solid var(--eg-line);
  border-radius: 12px;
  box-shadow: 0 12px 32px -8px rgba(20, 30, 10, 0.18);
  list-style: none;
  margin: 0;
  padding: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.city-search__option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 9px;
  font: 600 14px var(--eg-font);
  cursor: pointer;
  transition: background 0.1s;
}

.city-search__option:hover,
.city-search__option:active {
  background: var(--eg-brand-light);
}

.city-search__opt-icon {
  font-size: 18px;
  color: var(--eg-brand);
}

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
