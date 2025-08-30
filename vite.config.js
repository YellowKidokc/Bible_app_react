import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      // Exclude platform-specific dependencies from web build
      external: [
        'tauri-plugin-sql-api',
        '@capacitor-community/sqlite'
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          store: ['zustand']
        }
      }
    }
  },
  base: '/', // Important for Cloudflare Pages
  define: {
    // Ensure these are available for runtime platform detection
    global: 'globalThis'
  }
})
