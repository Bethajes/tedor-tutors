import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_UPSTREAM ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});