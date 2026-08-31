import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // The library lives in local storage, so the app is usable with no
      // network at all — it just could not load without one until now.
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Book Shelf — Physical Library Archive',
          short_name: 'Book Shelf',
          description: 'Digitize and track your physical bookshelf.',
          theme_color: '#12100E',
          background_color: '#12100E',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          ],
        },
        workbox: {
          // Firestore and the AI endpoints must never be served from cache.
          navigateFallbackDenylist: [/^\/api\//],
          // Precache the offline shell. The ZXing decoder and Firebase SDK are
          // excluded: together they are ~1.4MB and neither works offline.
          globPatterns: ['**/*.{css,html,svg,woff2,js}'],
          // The chart panels are part of the library page, so they belong in the
          // offline shell. Only the scanner decoder and the Firebase SDK are left
          // out: both are useless without a network anyway.
          globIgnores: ['**/vendor-zxing-*.js', '**/vendor-firebase-*.js'],
          runtimeCaching: [
            {
              // Lazily imported chunks: cache on first use so a later offline
              // session can still open the scanner or the dashboards.
              urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'script',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'app-chunks',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Book covers: show a cached one instead of an empty box offline.
              urlPattern: /^https:\/\/covers\.openlibrary\.org\/.*/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'book-covers',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    build: {
      // Only genuinely eager vendor code is named here. Firebase and Recharts are
      // deliberately absent: both are reached through dynamic imports, and naming
      // them would pull their chunks back into the initial module graph.
      rollupOptions: {
        output: {
          // A function keeps the lazily imported vendors out of the entry's
          // static graph (the object form pulled them back in) while still
          // giving them stable names the service worker config can target.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@zxing')) return 'vendor-zxing';
            // Kept as one chunk: splitting auth from firestore produced circular
            // chunks, which risks a module initialisation-order bug at runtime.
            // The whole thing is lazily imported, so it costs a signed-out
            // reader nothing.
            if (id.includes('firebase') || id.includes('@firebase') || id.includes('@grpc') || id.includes('protobufjs')) {
              return 'vendor-firebase';
            }
            if (id.includes('recharts') || id.includes('victory-vendor') || id.includes('/d3-')) return 'vendor-charts';
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
            if (id.includes('motion')) return 'motion';
            return undefined;
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
