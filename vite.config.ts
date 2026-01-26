import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ЗАМЕНИ 'repo-name' НА НАЗВАНИЕ ТВОЕГО РЕПОЗИТОРИЯ!
  // Слеш в начале и конце обязателен.
  base: '/xray-ui/', 
  server: {
    port: 3000,
  }
})