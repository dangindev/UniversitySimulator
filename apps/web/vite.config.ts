import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
const webRoot = import.meta.dirname;
export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:3001' },
    fs: {
      allow: [webRoot, resolve(webRoot, '../../packages/core'), resolve(webRoot, '../../packages/content')],
      deny: ['**/.env*', '**/.git/**', '**/.data/**', '**/private-bank/**', '**/apps/api/**', '**/apps/worker/**', '**/node_modules/@university-simulator/api/**', '**/node_modules/@university-simulator/worker/**', '**/infra/**'],
    },
  },
  preview: { host: '127.0.0.1', port: 4173 },
  build: { chunkSizeWarningLimit: 1800 },
});
