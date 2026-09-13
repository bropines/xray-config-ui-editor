import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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
  plugins: [react(), tailwindcss()],
  base: '/xray-config-ui-editor/', 
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
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