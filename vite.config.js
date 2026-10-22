import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_NAME, APP_DESCRIPTION } from './src/config.js'
import pkg from './package.json' with { type: 'json' }

// Su GitHub Pages l'app vive in una sottocartella (es. /luna/): la imposta il workflow di pubblicazione.
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    preact(),
    // Sostituisce %APP_NAME% in index.html, così il nome resta definito solo in src/config.js
    {
      name: 'nome-app',
      transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', APP_NAME),
    },
    VitePWA({
      // L'aggiornamento non ricarica l'app da solo: compare un avviso "Aggiorna".
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_NAME,
        description: APP_DESCRIPTION,
        lang: 'en',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2F2F7',
        theme_color: '#F2F2F7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tutto ciò che serve all'app viene salvato sul telefono: funziona offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest,woff2}'],
        // Del font Inter servono solo i caratteri latini (italiano e danese compresi)
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
