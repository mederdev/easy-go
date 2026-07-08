<script setup lang="ts">
/**
 * Skeleton — the single reusable loading placeholder primitive for the whole app.
 *
 * Use it directly for one-off shapes, or compose several of them inside a
 * preset (see TripCardSkeleton.vue) that mirrors the real content's layout.
 *
 * Examples:
 *   <Skeleton width="60%" height="18px" />          // a line of text
 *   <Skeleton :lines="3" />                          // a paragraph
 *   <Skeleton circle width="40px" height="40px" />   // an avatar
 *   <Skeleton height="120px" radius="16px" />        // a card block
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    /** CSS width — number is treated as px. Default: full width. */
    width?: string | number;
    /** CSS height — number is treated as px. */
    height?: string | number;
    /** Border radius — number is treated as px. */
    radius?: string | number;
    /** Render a perfect circle (radius 50%, width used for height if height unset). */
    circle?: boolean;
    /** Render N stacked text lines instead of a single shape. */
    lines?: number;
    /** Turn the shimmer off (e.g. inside long lists to reduce paint cost). */
    static?: boolean;
  }>(),
  {
    circle: false,
    lines: 0,
    static: false,
  },
);

const toCss = (v: string | number | undefined): string | undefined =>
  v === undefined ? undefined : typeof v === 'number' ? `${v}px` : v;

const rootStyle = computed(() => {
  const width = toCss(props.width);
  const height = toCss(props.height) ?? (props.circle ? width : undefined);
  const radius = props.circle ? '50%' : toCss(props.radius);
  return {
    width,
    height,
    borderRadius: radius,
  };
});
</script>

<template>
  <!-- Multi-line text block -->
  <div
    v-if="lines > 0"
    class="skeleton-lines"
    role="status"
    aria-busy="true"
    aria-label="Загрузка"
  >
    <span
      v-for="n in lines"
      :key="n"
      class="skeleton"
      :class="{ 'skeleton--static': static }"
      :style="{ height: rootStyle.height ?? '13px', width: n === lines ? '70%' : '100%' }"
    />
  </div>

  <!-- Single shape -->
  <div
    v-else
    class="skeleton"
    :class="{ 'skeleton--static': static }"
    :style="rootStyle"
    role="status"
    aria-busy="true"
    aria-label="Загрузка"
  />
</template>

<style scoped>
.skeleton {
  display: block;
  width: 100%;
  height: 1em;
  border-radius: 8px;
  background-color: var(--eg-skeleton-base, #E9ECE6);
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    var(--eg-skeleton-shine, rgba(255, 255, 255, 0.65)) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  background-position: -150% 0;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

.skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.skeleton--static {
  animation: none;
  background-image: none;
}

@keyframes skeleton-shimmer {
  to {
    background-position: 150% 0;
  }
}

/* Respect users who ask for less motion — show a static placeholder. */
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    background-image: none;
  }
}
</style>
