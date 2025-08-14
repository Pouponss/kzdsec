import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server config
export default defineConfig({
  plugins: [react()],
  server: {
    // change le port si besoin (par défaut 5173)
    // port: 5173,
    proxy: {
      // Toute requête front vers /kazadi/* sera proxifiée vers Railway
      '/kazadi': {
        target: 'https://kazadi-securepay-api-production.up.railway.app',
        changeOrigin: true,   // header Host réécrit -> évite CORS
        secure: true,         // accepte HTTPS valide
        ws: true,             // proxy WebSocket si nécessaire
        rewrite: (path) => path.replace(/^\/kazadi/, ''), // /kazadi/api/... -> /api/...
      },
    },
  },
  // pour "vite preview" si tu testes un build localement
  preview: {
    proxy: {
      '/kazadi': {
        target: 'https://kazadi-securepay-api-production.up.railway.app',
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/kazadi/, ''),
      },
    },
  },
});

