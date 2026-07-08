<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
  subtitle?: string;
  /** Raise above another open modal (default overlay z-index is 50). */
  zIndex?: number;
}>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="overlay"
        :style="zIndex != null ? { zIndex } : undefined"
        @click.self="emit('close')"
      >
        <div class="modal" role="dialog" aria-modal="true">
          <div class="head">
            <div class="titles">
              <div class="title">{{ title }}</div>
              <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
            </div>
            <button class="close" type="button" @click="emit('close')">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="body" data-scroll>
            <slot />
          </div>
          <div v-if="$slots.footer" class="footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 18, 20, 0.4);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 24px 60px -20px rgba(20, 30, 10, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.head {
  padding: 20px 24px;
  border-bottom: 1px solid #eef0ec;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.title {
  font: 800 18px var(--eg-font);
}
.subtitle {
  font: 500 12px var(--eg-font);
  color: var(--eg-hint);
  margin-top: 2px;
}
.close {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  border: 1px solid var(--eg-border);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close .material-symbols-outlined {
  font-size: 20px;
  color: var(--eg-muted);
}
.body {
  padding: 22px 24px;
  overflow: auto;
}
.footer {
  padding: 16px 24px;
  border-top: 1px solid #eef0ec;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.16s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
