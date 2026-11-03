import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

/** Import settings from .env (or the shell). Dev server only: a production build must never contain a key. */
function envAiSettings(mode: string) {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ANTHROPIC_API_KEY) return { provider: 'anthropic', apiKey: env.ANTHROPIC_API_KEY, ...(env.FFR_AI_MODEL ? { model: env.FFR_AI_MODEL } : {}) }
  if (env.OPENAI_API_KEY && env.FFR_AI_MODEL)
    return { provider: 'openai', apiKey: env.OPENAI_API_KEY, model: env.FFR_AI_MODEL, baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1' }
  return null
}

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __FFR_ENV_AI__: JSON.stringify(command === 'serve' && mode !== 'test' ? envAiSettings(mode) : null) },
}))
