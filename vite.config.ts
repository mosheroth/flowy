import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Project Pages live under /flowy/; Cursor Apps and local serve from /.
const pages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  plugins: [react()],
  base: pages ? '/flowy/' : '/',
})
