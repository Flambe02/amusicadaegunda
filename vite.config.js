import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  // ✅ SEO: Base path correct pour GitHub Pages et URLs propres
  base: command === 'build' ? '/' : '/',
  plugins: [react()],
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
    target: 'es2015',
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
            // React core: react, react-dom, scheduler, react-router, helmet
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router') || id.includes('react-helmet') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            // Supabase client (~100KB, rarement mis à jour)
            if (id.includes('@supabase') || id.includes('supabase')) {
              return 'vendor-supabase';
            }
            // date-fns (~30KB, utilisé seulement sur certaines pages)
            if (id.includes('date-fns')) {
              return 'vendor-date';
            }
            // Tout le reste des node_modules (radix-ui, lucide, etc.)
            return 'vendor-ui';
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
    open: true,
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