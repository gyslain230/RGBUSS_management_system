import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    historyApiFallback: {
      index: '/index.html',
      rewrites: [
        { from: /^\/dashboard/, to: '/index.html' },
        { from: /^\/stock/, to: '/index.html' },
        { from: /^\/sales/, to: '/index.html' },
        { from: /^\/reports/, to: '/index.html' },
        { from: /^\/users/, to: '/index.html' },
        { from: /^\/credits/, to: '/index.html' },
        { from: /^\/login/, to: '/index.html' },
        { from: /^\/register/, to: '/index.html' },
      ]
    },
  },
  preview: {
    historyApiFallback: {
      index: '/index.html',
      rewrites: [
        { from: /^\/dashboard/, to: '/index.html' },
        { from: /^\/stock/, to: '/index.html' },
        { from: /^\/sales/, to: '/index.html' },
        { from: /^\/reports/, to: '/index.html' },
        { from: /^\/users/, to: '/index.html' },
        { from: /^\/credits/, to: '/index.html' },
        { from: /^\/login/, to: '/index.html' },
        { from: /^\/register/, to: '/index.html' },
      ]
    },
  },
});