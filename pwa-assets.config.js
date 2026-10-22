// Genera tutte le icone (iPhone, PWA, favicon) da public/icona.svg con: npm run icone
import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// L'icona disegnata occupa già tutto il quadrato: niente margini bianchi.
// iOS arrotonda gli angoli da solo.
const pieno = { padding: 0, resizeOptions: { background: '#5E5CE6', fit: 'contain' } }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    transparent: { ...preset.transparent, ...pieno },
    maskable: { ...preset.maskable, ...pieno },
    apple: { ...preset.apple, ...pieno },
  },
  images: ['public/icona.svg'],
})
