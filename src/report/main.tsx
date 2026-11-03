import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from '@/i18n'
import { applyTheme, storedTheme } from '@/lib/theme'
import '@/styles.css'
import { DATA_PLACEHOLDER, type ReportPayload } from './payload'
import { Report } from './Report'

applyTheme(storedTheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

async function readPayload(): Promise<ReportPayload> {
  const text = document.getElementById('ffr-data')?.textContent?.trim() ?? ''
  if (text && text !== DATA_PLACEHOLDER) return JSON.parse(text) as ReportPayload
  // The dev server has no embedded data; show the fictional sample so the page can be worked on.
  if (import.meta.env.DEV) {
    const { sampleYearAgo, samplePrevious, sampleCurrent } = await import('@/sample')
    return { format: 'family-finance-review/report@1', mode: new URLSearchParams(location.search).has('saved') ? 'saved' : 'preview', snapshots: [sampleYearAgo, samplePrevious, sampleCurrent] }
  }
  throw new Error('This report has no data.')
}

readPayload().then((payload) =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider initial={payload.locale}>
        <Report payload={payload} />
      </I18nProvider>
    </StrictMode>,
  ),
)
