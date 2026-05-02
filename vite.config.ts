import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/xray-config-ui-editor/', 
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
    port: 3000,
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