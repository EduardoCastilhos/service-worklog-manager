import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Gera os assets usados pelo Fastify e um manifesto em caminho fácil de incluir na Vercel.
export default defineConfig({
  plugins: [react()],
  build: { manifest: 'manifest.json', outDir: 'dist' },
})
