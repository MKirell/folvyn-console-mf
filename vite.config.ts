import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { localAssets } from './vite/local-assets'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : '/app/console/',
  plugins: [vue(), tailwindcss(), localAssets()],
  resolve: {
    alias: { '@': resolve(rootDir, 'src') },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    assetsInlineLimit: (file: string) => !file.includes('country-flag-icons'),
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
}))
