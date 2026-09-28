import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // Bundles the GeoJSON and all datasets so the app works fully offline.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
  },
});
