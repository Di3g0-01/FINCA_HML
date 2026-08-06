import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mui') || id.includes('@emotion')) {
              return 'ui';
            }
            if (id.includes('react/') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            return 'vendor-other';
          }
        }
      }
    }
  }
})
