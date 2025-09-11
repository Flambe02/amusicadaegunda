import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://efnzmpzkzeuktqkghwfa.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmbnptcHpremV1a3Rxa2dod2ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMzE4MzcsImV4cCI6MjA3MTgwNzgzN30.iQiDuurPIkSNjHWP6TID0dATrOCJQ71-kblcsRsHiAk'),
  },
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
        ? ['console.log', 'console.debug', 'console.info', 'console.trace'] 
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
    hmr: false // Désactive HMR pour éviter les problèmes WebSocket
  },
})) 