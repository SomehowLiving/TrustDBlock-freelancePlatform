import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
       '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@store': path.resolve(__dirname, 'src/components/store'),
      '@pages': path.resolve(__dirname, 'src/components/pages'),
      '@routing': path.resolve(__dirname, 'src/components/routing'),
      '@lib': path.resolve(__dirname, 'src/components/lib'),
  // Add more aliases as needed
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
