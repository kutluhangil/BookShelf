import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      // Charts and the animation runtime dominate the eager bundle; splitting them
      // keeps the initial payload from being one 1.6MB file. Firebase is deliberately
      // NOT listed here: it is loaded through dynamic imports, so Rollup emits it as
      // separate async chunks that a reader who never signs in never downloads.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
            charts: ['recharts'],
            motion: ['motion/react'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
