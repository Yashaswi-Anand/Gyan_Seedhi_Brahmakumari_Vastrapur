import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // host: true makes the dev server reachable from phones on the same Wi-Fi
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});
