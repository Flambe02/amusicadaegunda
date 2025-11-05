import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
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
    // Optimisations pour les Core Web Vitals
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    esbuild: {
      drop: command === 'build' ? ['debugger'] : [],
      pure: command === 'build' 
        ? ['console.log', 'console.debug', 'console.info', 'console.trace', 'console.warn', 'console.error'] 
        : [],
    },
    rollupOptions: {
      output: {
        // Chunk splitting pour améliorer le caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
        },
        // Optimisation des noms de fichiers
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Optimisation des assets
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
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
})) 