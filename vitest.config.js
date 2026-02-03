import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: true,
    // Use threads instead of forks to avoid timeout issues on Windows
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Run tests sequentially to avoid race conditions
      },
    },
    testTimeout: 30000, // Increase timeout to 30 seconds
    // Exclure les tests E2E Playwright de Vitest
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/scripts/**',
      '**/tests/e2e/**',
      '**/*.e2e.{js,ts,jsx,tsx}',
    ],
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
        'scripts/',
        'tests/e2e/',
      ],
    },
  },
});

