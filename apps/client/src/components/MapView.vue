<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * 2GIS map. Renders an interactive MapGL map at [lng,lat] when VITE_2GIS_KEY is
 * configured; otherwise falls back to the styled placeholder (default slot).
 * The MapGL JS API is loaded from the 2GIS CDN on demand (no npm dependency).
 */
const props = withDefaults(
  defineProps<{ lat: number; lng: number; zoom?: number; markerLabel?: string }>(),
  { zoom: 15, markerLabel: '' },
);

const MAPGL_SRC = 'https://mapgl.2gis.com/api/js/v1';
const key = import.meta.env.VITE_2GIS_KEY as string | undefined;

const container = ref<HTMLDivElement | null>(null);
const showMap = ref(Boolean(key));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null;

function loadMapGl(): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.mapgl) return Promise.resolve(w.mapgl);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MAPGL_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(w.mapgl));
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = MAPGL_SRC;
    s.async = true;
    s.onload = () => resolve(w.mapgl);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

onMounted(async () => {
  if (!key || !container.value) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapgl = (await loadMapGl()) as any;
    map = new mapgl.Map(container.value, {
      center: [props.lng, props.lat],
      zoom: props.zoom,
      key,
    });
    // eslint-disable-next-line no-new
    new mapgl.Marker(map, { coordinates: [props.lng, props.lat] });
  } catch {
    showMap.value = false; // CDN/key failure → reveal placeholder
  }
});

onBeforeUnmount(() => {
  if (map) {
    map.destroy();
    map = null;
  }
});
</script>

<template>
  <div class="map-view">
    <div v-if="showMap" ref="container" class="map-canvas" />
    <div v-else class="map-placeholder">
      <slot>
        <span class="ms" style="font-size: 40px; color: var(--eg-green)">location_on</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.map-view {
  margin: 14px 16px 0;
  height: 150px;
  border-radius: 16px;
  overflow: hidden;
}
.map-canvas {
  width: 100%;
  height: 100%;
}
.map-placeholder {
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(135deg, #eef1ed, #eef1ed 11px, #e7eae4 11px, #e7eae4 22px);
}
</style>
