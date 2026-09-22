import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'child_process'

let gitHash = 'dev'
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) { }

let gitTag = '1.0.0'
try {
  gitTag = execSync('git describe --tags --abbrev=0').toString().trim().replace(/^v/, '')
} catch (e) { }

const appVersion = `v${gitTag}-${gitHash}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt', never 'autoUpdate': activating a new worker reloads the
      // page, and this app's main surface is a text editor with unsaved work
      // in it.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png', 'robots.txt'],
      // `scope` and `start_url` are derived from `base`; setting them by hand
      // is how a project-page deployment ends up claiming the whole origin.
      manifest: {
        name: 'Xray Config UI Editor',
        short_name: 'Xray Editor',
        description: 'Visual editor for Xray-core configs, with Remnawave panel sync.',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'any',
        categories: ['utilities', 'developer'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Workbox drops anything over 2 MiB from the precache by DEFAULT, and
        // says nothing about it. The main chunk is several times that, so the
        // default would ship a service worker that quietly cannot work
        // offline at all.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        runtimeCaching: [
          // Fonts are the one third-party request worth holding: without them
          // the code editor measures the wrong character width and the caret
          // drifts away from the text it sits in.
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // Everything else is deliberately NOT cached and NOT intercepted:
        //  - the user's Remnawave panel (bearer-token API),
        //  - the WARP registration worker -- caching it would hand every user
        //    the same keypair,
        //  - the CORS proxies and the GitHub commits feed,
        //  - geo .dat files, which are tens of megabytes and already cached
        //    in IndexedDB with a TTL of their own.
      },
      devOptions: { enabled: false },
    }),
  ],
  base: '/xray-config-ui-editor/', 
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  build: {
    rollupOptions: {
      output: {
        // One 7 MB chunk means every deploy re-downloads all of it, which
        // matters a great deal more once a service worker is precaching it.
        // By path rather than by package name: the JSX runtime and
        // `react-dom/client` are separate entry points, and naming the bare
        // packages produced an empty react chunk while everything stayed in
        // the main one.
        // Rollup normalises module ids to forward slashes on every platform.
        manualChunks(id: string) {
          // Generated path data: a large file that changes only when an icon
          // is added, so it has no business riding along in every update.
          if (id.includes('icon-map.generated')) return 'icons';
          if (!id.includes('node_modules')) return;
          if (/\/(@codemirror|@lezer|@platformos)\//.test(id)) return 'codemirror';
          if (/\/(@xyflow|dagre|d3-)/.test(id)) return 'topology';
          if (/\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/\/(protobufjs|@protobufjs)\//.test(id)) return 'protobuf';
          if (/\/(ajv|zod-to-json-schema|comment-json)\//.test(id)) return 'schema';
        },
      },
    },
  },
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/autocomplete',
      '@codemirror/lint'
    ]
  },
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/autocomplete',
      '@codemirror/lint',
      '@codemirror/commands',
      '@codemirror/search',
      '@codemirror/lang-json',
      '@codemirror/theme-one-dark'
    ]
  },
  server: {
    // Default stays 3000 for `bun run dev`; PORT overrides it so a launcher
    // can pick a free port when 3000 is already taken (a local Remnawave
    // panel uses it). Nothing here needs a fixed port — the app is static and
    // the panel's CORS allowlist is keyed to the deployed origin, not localhost.
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
    watch: {
      usePolling: true,
      interval: 100
    },
    hmr: {
      overlay: true
    }
  }
})