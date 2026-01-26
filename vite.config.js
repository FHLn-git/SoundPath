import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Allow optional dependencies to fail gracefully
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
