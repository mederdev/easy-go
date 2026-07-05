import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true, // expose on LAN so phones on the same Wi-Fi can connect
    port: 8100,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    // Ionic (~1MB raw) is an intentional, separately-cached vendor chunk.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split the vendor bundle so the heavy, rarely-changing framework code
        // (Ionic ~230kB gz) is cached separately from app code and loads in
        // parallel. Ionic still lazy-loads its own components as p-*.js chunks.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@ionic') || id.includes('ionicons') || id.includes('@stencil')) return 'ionic';
          if (id.includes('@capacitor')) return 'capacitor';
          if (id.includes('/vue/') || id.includes('/@vue/') || id.includes('vue-router') || id.includes('/pinia/')) {
            return 'vue-vendor';
          }
        },
      },
    },
  },
});
