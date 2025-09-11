import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base absoluta cuando se sirve la SPA desde la raíz del dominio/backend
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Agrupar dependencias grandes para mejor caché y chunking
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
          mui: ['@mui/material', '@mui/system', '@mui/icons-material'],
          'mui-x': ['@mui/x-date-pickers', '@mui/x-charts'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        // Actualizado a nuevo puerto backend 8010
        target: 'http://localhost:8010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
