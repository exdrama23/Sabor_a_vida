import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' 

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  base: './',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:2923',
        changeOrigin: true
      }
    }
  }
})
