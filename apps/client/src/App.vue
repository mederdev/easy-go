<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted } from 'vue';
import { useConfigStore } from './stores/config.js';

const configStore = useConfigStore();

onMounted(() => {
  void configStore.load();
});
</script>

<template>
  <IonApp>
    <IonRouterOutlet />
  </IonApp>
</template>
