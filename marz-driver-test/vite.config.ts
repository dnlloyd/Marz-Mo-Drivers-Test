import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/marz-driver-test/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src'
    },
  },
})
