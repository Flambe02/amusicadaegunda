import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { buildCurrentSongBootUrl } from './src/api/songColumns.js'
import { resolveSupabasePublicConfig } from './src/lib/supabasePublicConfig.js'
import { detectInterface } from './src/lib/interfaceRule.js'

// index.html demande la chanson de la semaine AVANT le JavaScript de l'app (bloc
// « amds-boot ») : l'adresse de cette requête est écrite ici, à partir des mêmes
// colonnes et de la même configuration Supabase que le client.
function amdsBootPlugin(mode) {
  return {
    name: 'amds-boot',
    transformIndexHtml(html) {
      const env = { ...process.env, ...loadEnv(mode, process.cwd(), 'VITE_') }
      const { url, key } = resolveSupabasePublicConfig(env)
      // La règle d'interface (mobile / grand écran) : le texte même de la fonction de
      // l'app, pour qu'index.html et React ne puissent jamais diverger.
      return html
        .replace('__AMDS_BOOT_CURRENT_SONG_URL__', buildCurrentSongBootUrl(url, key))
        .replace('__AMDS_DETECT_INTERFACE__', `(${detectInterface.toString()})`)
    },
  }
}

// zod + dompurify : validation et assainissement de l'admin et du login. Aucune des
// deux n'importe React, et seuls des modules de `src` les importent.
const LAZY_ONLY_LIBRARIES = /[\\/]node_modules[\\/](zod|dompurify)[\\/]/

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  // ✅ SEO: Base path correct pour GitHub Pages et URLs propres
  base: command === 'build' ? '/' : '/',
  plugins: [react(), amdsBootPlugin(mode)],
  // ✅ SÉCURITÉ: Les variables d'environnement sont maintenant chargées depuis .env
  // Les clés Supabase ne sont plus exposées dans le code source
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    // ✅ PERFORMANCE: Optimisations pour les Core Web Vitals
    target: 'es2020',
    // ✅ FIX FINAL: esbuild sans drop (scheduler a besoin de console/debugger intacts)
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true, // Code splitting CSS pour réduire les blocs
    esbuild: {
      // ✅ legalComments: 'none' supprime uniquement les commentaires de licence
      // ✅ Cela NE supprime PAS console/debugger (ce serait 'drop: ["console"]')
      // ✅ Configuration optimale confirmée dans FIX_REACT_SCHEDULER_FINAL.md
      legalComments: 'none', // Réduit la taille du bundle en supprimant les commentaires de licence
    },
    rollupOptions: {
      output: {
        // ✅ PERFORMANCE: Vendor chunk splitting pour chargement parallèle + cache long-terme
        // Avec HTTP/2, les chunks se téléchargent en parallèle au lieu de séquentiellement
        // Résultat: 620KB monolithique → ~5 chunks parallèles (le plus gros ~200KB)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Bibliothèques SANS React, importées seulement par des écrans chargés à la
            // demande (admin, login) : hors de vendor-app, Rollup les range avec ces
            // écrans (vendor-app : 186 → 165 Ko gzip, téléchargé à chaque visite).
            // Ne jamais ajouter ici une bibliothèque qui importe React (piège forwardRef
            // ci-dessous), ni une dépendance d'une bibliothèque restée dans vendor-app :
            // Rollup l'y ramène (norigin-core, lodash-es, qrcode-generator).
            if (LAZY_ONLY_LIBRARIES.test(id)) {
              return undefined;
            }
            // Supabase client (~100KB, rarement mis à jour)
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // date-fns (~30KB, utilisé seulement sur certaines pages)
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            // React + Radix UI + lucide etc. groupés ensemble
            // (Radix UI utilise React.forwardRef au top-level → split cross-chunk
            // crashe sur Capacitor/WebView "Cannot read properties of undefined (reading 'forwardRef')")
            return 'vendor-app';
          }
        },
        // Optimisation des noms de fichiers
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Optimisation des assets - réduire la limite pour forcer l'externalisation
    assetsInlineLimit: 2048, // Réduit de 4096 à 2048 pour réduire le JS inline
    chunkSizeWarningLimit: 500, // Réduire pour forcer plus de splitting
  },
  // Optimisations de développement
  server: {
    port: 3000,
    strictPort: true,
    host: true,
    open: !process.env.CI,
    // HMR désactivé pour éviter les erreurs websocket dans cet environnement
    hmr: false
  },
  // Configuration Vitest
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.js',
        '**/*.config.cjs',
        'dist/',
        'build/',
      ],
    },
  },
})) 
