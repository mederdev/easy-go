<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { IonModal } from '@ionic/vue';
import EgCalendar from '@/components/EgCalendar.vue';

interface HighlightedDate {
  date: string;
  textColor?: string;
  backgroundColor?: string;
}

const props = defineProps<{
  open: boolean;
  modelValue: string;
  minDate?: string;
  highlightedDates?: HighlightedDate[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:modelValue': [value: string];
}>();

const windowWidth = ref(window.innerWidth);
function onResize() { windowWidth.value = window.innerWidth; }
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));
const isDesktop = computed(() => windowWidth.value >= 768);

// Local draft — updated as user taps days, committed only on "Готово"
const localDate = ref(props.modelValue);
watch(() => props.modelValue, (v) => { localDate.value = v; });

function confirm() {
  emit('update:modelValue', localDate.value);
  emit('update:open', false);
}

function close() { emit('update:open', false); }
</script>

<template>
  <!-- Mobile: bottom sheet -->
  <IonModal
    v-if="!isDesktop"
    :is-open="open"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
    class="dp-modal"
    @did-dismiss="close"
  >
    <div class="dp-sheet">
      <EgCalendar
        :model-value="localDate"
        :min-date="minDate"
        :highlighted-dates="highlightedDates"
        @update:model-value="localDate = $event"
      />
      <button class="dp-confirm" @click="confirm">Готово</button>
    </div>
  </IonModal>

  <!-- Desktop: centered overlay -->
  <Teleport v-else to="body">
    <Transition name="dp-fade">
      <div v-if="open" class="dp-overlay" @click.self="close">
        <div class="dp-card">
          <EgCalendar
            :model-value="localDate"
            :min-date="minDate"
            :highlighted-dates="highlightedDates"
            @update:model-value="localDate = $event"
          />
          <button class="dp-confirm dp-confirm--card" @click="confirm">Готово</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dp-sheet {
  padding: 8px 0 32px;
}

.dp-confirm {
  display: block;
  width: calc(100% - 32px);
  margin: 12px 16px 0;
  height: 50px;
  border: none;
  border-radius: 14px;
  background: #56A919;
  color: #fff;
  font: 700 16px 'Manrope', sans-serif;
  cursor: pointer;
}

.dp-confirm:active { opacity: 0.88; }
</style>

<style>
.dp-modal {
  --height: auto;
  --border-radius: 20px 20px 0 0;
}

.dp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dp-card {
  background: #fff;
  border-radius: 20px;
  padding-bottom: 20px;
  width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
}

.dp-confirm--card {
  background: #56A919;
}

.dp-confirm--card:hover { background: #3E7C12; }

.dp-fade-enter-active,
.dp-fade-leave-active { transition: opacity 0.18s ease; }
.dp-fade-enter-from,
.dp-fade-leave-to { opacity: 0; }
</style>
