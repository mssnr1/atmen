import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Served from a sub-path on GitHub Pages (e.g. /breath/); set by the deploy workflow.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      pwaAssets: { config: true, overrideManifestIcons: true, injectThemeColor: false },
      manifest: {
        name: 'atmen',
        short_name: 'atmen',
        description: 'Die Kunst, besser zu atmen. Geführte Atemübungen.',
        theme_color: '#08141b',
        background_color: '#08141b',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
})
