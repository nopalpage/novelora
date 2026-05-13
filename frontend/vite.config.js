import { defineConfig } from 'vite'
import { resolve } from 'path'

/**
 * Novelora Frontend — Vite Config
 *
 * Deployment separation (v2.0):
 *  - Frontend → Cloudflare Pages (akun semua313) → novelora.my.id
 *  - Backend  → Cloudflare Workers (akun thedarkcube313) → api.novelora.my.id
 *
 * Dev lokal:
 *   1. Jalankan backend: `cd ../../../novelora-backend && wrangler dev --port 8787`
 *   2. Jalankan frontend: `VITE_API_URL=http://localhost:8787 vite`
 *   Atau set di .env.local: VITE_API_URL=http://localhost:8787
 */
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase'))    return 'supabase'
          if (id.includes('chart.js'))     return 'charts'
          if (id.includes('alpinejs'))     return 'alpine'
          if (id.includes('node_modules')) return 'vendor'
        },
        chunkFileNames:  'assets/[name]-[hash].js',
        entryFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
      },
    },
    reportCompressedSize: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    // Tidak ada proxy /api — frontend langsung call Worker URL (VITE_API_URL)
    // Untuk dev, set VITE_API_URL=http://localhost:8787 di .env.local
  },
  assetsInclude: ['**/*.wasm'],
})
