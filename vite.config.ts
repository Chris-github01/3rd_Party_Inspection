import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'copy-pdf-worker',
      buildStart() {
        try {
          copyFileSync(
            'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
            'public/pdf.worker.min.mjs'
          );
        } catch {}
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    include: ['recharts'],
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    copyPublicDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'pdf': ['pdfjs-dist', 'pdf-lib'],
          'utils': ['date-fns', 'papaparse', 'xlsx'],
        },
      },
    },
  },
});
