import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/__cloudinary': {
        target: 'https://res.cloudinary.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/__cloudinary/, ''),
      },
    },
  },
})
