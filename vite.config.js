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
      // ❌ NE PAS drop console/debugger (casse React Scheduler)
      legalComments: 'none',
    },
    rollupOptions: {
      output: {
        // ✅ CHUNK SPLITTING CORRIGÉ: scheduler DOIT rester avec React
        manualChunks: (id) => {
          // Vendor chunks séparés par dépendance
          if (id.includes('node_modules')) {
            // React core + scheduler + react-dom + react-router (ENSEMBLE)
            if (id.includes('react') || 
                id.includes('react-dom') || 
                id.includes('react-router') ||
                id.includes('scheduler')) {  // ✅ CRITIQUE: scheduler avec React
              return 'vendor';
            }
            // UI components (Radix UI, Lucide icons)
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'ui';
            }
            // Supabase (API backend)
            if (id.includes('@supabase')) {
              return 'supabase';
            }
            // Utilities (date-fns, etc.)
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils';
            }
            // Analytics & monitoring
            if (id.includes('web-vitals')) {
              return 'webvitals';
            }
            // Autres dépendances
            return 'libs';
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