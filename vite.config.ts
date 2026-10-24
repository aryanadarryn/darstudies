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
      // The manifest is not linked from index.html: installing the app is a perk for eligible users, so
      // src/lib/installability.ts adds the <link rel="manifest"> (public/manifest.webmanifest) only for them.
      manifest: false,
      workbox: {
        // Content JSON is bundled into lazy JS chunks, so precaching every chunk makes the app fully offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
})
