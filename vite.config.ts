import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/hours-master-a-skill/' : './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
