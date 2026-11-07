import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    fs: { allow: ['.', '../data_samples'] },
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
  },
  build: {
    target: 'esnext', outDir: 'dist', sourcemap: false,
    rolldownOptions: {
      output: {
        manualChunks: (id) => id.includes('/node_modules/konva/') || id.includes('/node_modules/react-konva/')
          ? 'konvaEngine'
          : undefined
      }
    }
  }
});
