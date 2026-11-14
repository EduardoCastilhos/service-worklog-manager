import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Gera os assets em public/ para que a Vercel os publique junto do servidor Fastify.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/client/main.tsx',
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (asset) =>
          asset.name?.endsWith('.css') ? 'assets/app.css' : 'assets/[name]-[hash][extname]',
      },
    },
  },
})
