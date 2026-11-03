import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds report.html as one self-contained file (scripts, styles and fonts inlined) that the CLI fills with data.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist-report',
    emptyOutDir: true,
    rollupOptions: { input: fileURLToPath(new URL('./report.html', import.meta.url)) },
  },
})
