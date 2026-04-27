import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/xray-config-ui-editor/', 
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Оптимизация для WSL (Windows File System)
    watch: {
      usePolling: true,
      interval: 100
    },
    hmr: {
      overlay: true
    }
  }
})
