<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted } from 'vue';
import { useConfigStore } from './stores/config.js';
import { useAuthStore } from './stores/auth.js';

const configStore = useConfigStore();
const authStore = useAuthStore();

onMounted(() => {
  void configStore.load();
  // Restore the customer session from a stored token, if any.
  void authStore.fetchMe();
});
</script>

<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>
