import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // La app se actualiza sola cuando hay una versión nueva publicada.
      registerType: 'autoUpdate',
      // El manifiesto se mantiene explícito en public/manifest.json.
      manifest: false,
      includeAssets: [
        'img_ganamos_launcher.jpg',
        'img_ganamos_emblem.jpg',
        'icons/*.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico,woff,woff2}'],
        // Las capturas de referencia de /assets/aistudio no forman parte de la app.
        globIgnores: ['assets/aistudio/**'],
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
