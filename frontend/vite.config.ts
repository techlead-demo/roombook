import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const webPort = Number(process.env.WEB_PORT ?? 5201)
const apiPort = Number(process.env.API_PORT ?? 5202)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Design tokens are shared with the mockups in project-context/design
      '@design': fileURLToPath(new URL('../project-context/design', import.meta.url)),
    },
  },
  server: {
    port: webPort,
    strictPort: true,
    proxy: { '/api': `http://localhost:${apiPort}` },
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
  },
})
