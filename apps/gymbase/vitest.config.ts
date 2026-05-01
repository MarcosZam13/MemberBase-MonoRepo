import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

const rootDir = path.resolve(__dirname, '../..')

export default defineConfig({
  plugins: [react()],
  root: rootDir,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./apps/gymbase/src/test/setup.ts'],
    include: ['apps/gymbase/src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/setup.ts',
        '**/mock*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'apps/gymbase/src'),
      '@core': path.resolve(rootDir, 'packages/core/src'),
      '@memberbase/core': path.resolve(rootDir, 'packages/core/src'),
    },
  },
})