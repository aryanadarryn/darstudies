import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH is set by the GitHub Pages workflow (e.g. /darstudies/); '/' everywhere else.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Darstudies — Form 4 Study Companion',
        short_name: 'Darstudies',
        description: 'Preview and revise Form 4 KSSM subjects, with a daily study plan.',
        theme_color: '#6d28d9',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Content JSON is bundled into lazy JS chunks, so precaching every chunk makes the app fully offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
})
