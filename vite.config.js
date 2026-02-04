import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  appType: 'spa',
  plugins: [react()],
  // Allow optional dependencies to fail gracefully
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        // Basic vendor chunking to reduce mega-bundles and quiet the 500kB warning.
        // Groups node_modules by top-level package.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const parts = id.split('node_modules/')[1].split('/')
          const name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
          return `vendor-${name.replace('@', '').replace('/', '-')}`
        },
      },
    },
  },
})
