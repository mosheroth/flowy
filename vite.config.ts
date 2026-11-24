import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base works on GitHub Pages (/flowy/) and root hosts (Cursor Apps).
export default defineConfig({
  plugins: [react()],
  base: './',
})
