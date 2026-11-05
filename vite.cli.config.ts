import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// Bundles the agent CLI into one dependency-free Node script inside the skill, with the report page embedded.
// Build the report first (vite.report.config.ts); this imports dist-report/report.html.
export default defineConfig({
  publicDir: false,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  ssr: { noExternal: true },
  build: {
    ssr: fileURLToPath(new URL('./src/cli/mora.ts', import.meta.url)),
    outDir: 'skills/mora/scripts',
    emptyOutDir: false,
    target: 'node20',
    minify: false,
    rollupOptions: { output: { entryFileNames: 'mora.mjs', format: 'es', banner: '#!/usr/bin/env node' } },
  },
})
