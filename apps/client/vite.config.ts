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
  },
});
