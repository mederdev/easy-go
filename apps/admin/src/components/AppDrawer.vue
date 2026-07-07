<script setup lang="ts">
defineProps<{
  open: boolean;
}>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="overlay" @click="emit('close')" />
    </Transition>
    <Transition name="slide">
      <aside v-if="open" class="drawer" role="dialog" aria-modal="true">
        <slot />
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 18, 20, 0.35);
  z-index: 40;
}
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 100%;
  background: #fff;
  z-index: 41;
  box-shadow: -12px 0 40px -16px rgba(20, 30, 10, 0.3);
  display: flex;
  flex-direction: column;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.22s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
