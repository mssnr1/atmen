import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// PWA icons are generated from public/icon.svg at build time.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0b1a24' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0b1a24' } },
  },
  images: ['public/icon.svg'],
})
