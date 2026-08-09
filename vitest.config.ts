import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(rootDir, 'src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    env: {
      VITE_API_BASE_URL: 'http://localhost:3000/api/v1',
      VITE_COGNITO_DOMAIN: 'https://auth.test.invalid',
      VITE_COGNITO_CLIENT_ID: 'test-client-id',
      VITE_SITE_URL: 'http://localhost:5173',
      VITE_ASSETS_BASE_URL: 'http://localhost:5173',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/main.ts', 'src/types/**'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
})
