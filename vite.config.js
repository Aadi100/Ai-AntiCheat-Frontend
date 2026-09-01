import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Only actual backend API/asset paths. Do NOT add client-side React
      // Router route names here (e.g. /dashboard, /dataset, /billing,
      // /unknown, /unknown-dataset, /camera-setup, /web-settings) — those are
      // pages the SPA itself renders, and previously they were also listed
      // here, which meant a hard refresh (or direct navigation) on any of
      // those URLs bypassed the SPA and hit the Flask backend directly
      // instead of serving index.html.
      '/api': {
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

