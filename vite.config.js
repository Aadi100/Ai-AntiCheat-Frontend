import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/dashboard': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/detection': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/camera-setup': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/billing': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/dataset': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/unknown': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/unknown-dataset': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/web-settings': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/console-log': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})

