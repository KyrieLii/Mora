import { AmountInput } from '@/components/ledger/AmountInput'
import { Segmented } from '@/components/ledger/GroupSheet'
import { InfoTip } from '@/components/ledger/InfoTip'
import { CATEGORIES, FLOW_CATEGORIES, GROUPS, type Currency, type Frequency, type Snapshot } from '@/engine'
import { useI18n } from '@/i18n'
import { money, shortMoney } from '@/lib/format'
import { readImage, type ImageInput } from '@/lib/import/image'
import { applyProposals, proposeChanges } from '@/lib/import/match'
import { kindOf } from '@/lib/import/parse'
import { ImportError, recognise, testConnection } from '@/lib/import/providers'
import { DEFAULT_MODEL, forgetSettings, isReady, loadSettings, saveSettings, usesEnvKey, type AiSettings, type Provider } from '@/lib/import/settings'
import type { ImportLine } from '@/lib/import/types'
import { cn } from '@/lib/utils'
import { Check, ChevronLeft, ImagePlus, LoaderCircle, RefreshCw, Settings2, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Toast, type ToastMessage } from './Toast'

type Step = 'input' | 'settings' | 'loading' | 'review'
interface Row {
  line: ImportLine
  selected: boolean
}

const FIELD = 'glass-capsule h-11 w-full rounded-xl px-3.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40'
const ACTION = 'liquid-action h-[52px] w-full rounded-full text-[17px] font-bold transition-transform active:scale-[0.98] disabled:opacity-40'
const QUIET = 'glass-capsule h-11 rounded-full px-4 text-[15px] font-semibold transition-transform active:scale-[0.98] disabled:opacity-50'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint}
    </label>
  )
}

type Connection = 'untested' | 'testing' | 'ok' | 'error'
const DOT: Record<Connection, string> = { untested: 'bg-muted-foreground/45', testing: 'bg-muted-foreground/45', ok: 'bg-gain', error: 'bg-destructive' }

/** Tests the connection; the dot shows the result: grey untested, green connected, red failed. Remount it when the settings change. */
function ConnectionTest({ form, onError }: { form: AiSettings; onError: (text: string) => void }) {
  const { t } = useI18n()
  const s = t.importer.setup
  const [state, setState] = useState<Connection>('untested')
  const label = { untested: s.untested, testing: s.testing, ok: s.testOk, error: s.testFailed }[state]

  return (
    <button
      type="button"
      aria-label={`${s.test} · ${label}`}
      title={`${s.test} · ${label}`}
      className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      disabled={!isReady(form) || state === 'testing'}
      onClick={async () => {
        setState('testing')
        try {
          await testConnection(form)
          setState('ok')
        } catch (error) {
          setState('error')
          onError(errorText(t, error))
        }
      }}
    >
      <RefreshCw className={cn('size-4.5', state === 'testing' && 'animate-spin')} />
      <span aria-hidden className={cn('absolute top-2.5 right-2.5 size-2 rounded-full transition-colors', DOT[state])} />
    </button>
  )
}

function SettingsStep({ settings, onSave, onBack, onError }: { settings: AiSettings; onSave: (next: AiSettings) => void; onBack?: () => void; onError: (text: string) => void }) {
  const { t } = useI18n()
  const s = t.importer.setup
  const [form, setForm] = useState(settings)
  const [status, setStatus] = useState<string | null>(null)
  const fromEnv = usesEnvKey(form)
  const update = (patch: Partial<AiSettings>) => {
    setForm((current) => ({ ...current, ...patch }))
    setStatus(null)
  }
  const switchProvider = (provider: Provider) =>
    update({ provider, model: form.model && form.model !== DEFAULT_MODEL[form.provider] ? form.model : DEFAULT_MODEL[provider] })

  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-[15px] leading-relaxed text-muted-foreground">{s.intro}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-muted-foreground">{s.provider}</span>
        <Segmented label={s.provider} value={form.provider} options={[['anthropic', s.anthropic], ['openai', s.openai]]} onChange={switchProvider} />
      </div>
      {form.provider === 'openai' && <p className="-mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.openaiHint}</p>}
      <div className="grid gap-1.5">
        <div className="flex items-center gap-1">
          <label htmlFor="ffr-api-key" className="text-[13px] font-semibold text-muted-foreground">
            {s.apiKey}
          </label>
          <InfoTip label={s.apiKey}>{fromEnv ? s.fromEnv : s.keyNote}</InfoTip>
        </div>
        <div className="relative">
          <input
            id="ffr-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            className={cn(FIELD, 'pr-12')}
            placeholder={s.apiKeyPlaceholder}
            value={form.apiKey}
            onChange={(event) => update({ apiKey: event.target.value })}
          />
          {/* Any edit makes the last result stale, so a new key starts it untested. */}
          <ConnectionTest key={[form.provider, form.apiKey, form.model, form.baseUrl].join('\n')} form={form} onError={onError} />
        </div>
      </div>
      <Field label={s.model}>
        <input autoComplete="off" spellCheck={false} className={FIELD} placeholder={form.provider === 'anthropic' ? DEFAULT_MODEL.anthropic : 'qwen-vl-max'} value={form.model} onChange={(event) => update({ model: event.target.value })} />
      </Field>
      {form.provider === 'openai' && (
        <Field label={s.baseUrl}>
          <input type="url" autoComplete="off" spellCheck={false} className={FIELD} placeholder={s.baseUrlPlaceholder} value={form.baseUrl} onChange={(event) => update({ baseUrl: event.target.value })} />
        </Field>
      )}
      {status && (
        <p role="status" className="text-[14px] font-semibold text-muted-foreground">
          {status}
        </p>
      )}
      {settings.apiKey && !usesEnvKey(settings) && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(QUIET, 'text-destructive')}
            onClick={() => {
              forgetSettings()
              setForm({ ...form, apiKey: '' })
              onSave({ ...form, apiKey: '' })
              setStatus(s.forgotten)
            }}
          >
            {s.forget}
          </button>
        </div>
      )}
      <div className="grid gap-2">
        <button type="button" className={ACTION} disabled={!isReady(form)} onClick={() => onSave(form)}>
          {onBack ? s.save : s.saveAndContinue}
        </button>
      </div>
    </div>
  )
}

function errorText(t: ReturnType<typeof useI18n>['t'], error: unknown) {
  const code = error instanceof ImportError ? error.code : 'provider'
  return t.importer.errors[code] ?? t.importer.errors.provider!
}

function warningText(t: ReturnType<typeof useI18n>['t'], warning: string) {
  if (warning.startsWith('skipped-currency:')) return t.importer.skippedCurrency(warning.slice('skipped-currency:'.length))
  if (warning === 'unreadable-response') return t.importer.unreadable
  return warning
}

function InputStep({
  images,
  text,
  provider,
  error,
  onImages,
  onRemove,
  onText,
  onSubmit,
}: {
  images: ImageInput[]
  text: string
  provider: string
  error: string | null
  onImages: (files: File[]) => void
  onRemove: (id: string) => void
  onText: (text: string) => void
  onSubmit: () => void
}) {
  const { t } = useI18n()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div className="grid grid-cols-1 gap-4">
      <button
        type="button"
        className={cn(
          'grid min-h-36 place-items-center gap-2 rounded-[1.25rem] border-[1.5px] border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50',
        )}
        onClick={() => fileRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          onImages([...event.dataTransfer.files])
        }}
      >
        <span className="grid size-11 place-items-center rounded-full bg-primary/15 text-primary">
          <ImagePlus className="size-5.5" />
        </span>
        <span className="text-[15px] font-semibold">{dragging ? t.importer.dropActive : t.importer.drop}</span>
        <span className="hidden text-[13px] text-muted-foreground [@media(pointer:fine)]:block">{t.importer.pasteHint}</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          onImages([...(event.target.files ?? [])])
          event.target.value = ''
        }}
      />
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2.5">
          {images.map((image, index) => (
            <li key={image.id} className="relative">
              <img src={image.preview} alt="" className="size-20 rounded-xl border border-border object-cover" />
              <button
                type="button"
                aria-label={t.importer.removeImage(index + 1)}
                className="glass-capsule absolute -top-2 -right-2 grid size-7 place-items-center rounded-full after:absolute after:-inset-2"
                onClick={() => onRemove(image.id)}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Field label={t.importer.textLabel}>
        <textarea rows={3} className={cn(FIELD, 'h-auto resize-none py-3 leading-relaxed')} placeholder={t.importer.textPlaceholder} value={text} onChange={(event) => onText(event.target.value)} />
      </Field>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{t.importer.privacy(provider)}</p>
      {error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] font-semibold text-destructive">
          {error}
        </p>
      )}
      <button type="button" className={ACTION} disabled={images.length === 0 && !text.trim()} onClick={onSubmit}>
        {t.importer.recognise}
      </button>
    </div>
  )
}

function CategorySelect({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  const { t } = useI18n()
  return (
    <select aria-label={t.importer.categoryLabel} className={cn(FIELD, 'h-9 w-0 min-w-[8.5rem] flex-1 truncate rounded-full py-0 pr-8 text-[14px] font-semibold')} value={value} onChange={(event) => onChange(event.target.value)}>
      {GROUPS.map((group) => (
        <optgroup key={group.id} label={t.groups[group.id]}>
          {CATEGORIES.filter((entry) => entry.group === group.id && (!entry.legacy || entry.id === value)).map((entry) => (
            <option key={entry.id} value={entry.id}>
              {t.categories[entry.id]}
            </option>
          ))}
        </optgroup>
      ))}
      {(['income', 'expense'] as const).map((kind) => (
        <optgroup key={kind} label={t.importer.kinds[kind]}>
          {FLOW_CATEGORIES.filter((entry) => entry.kind === kind && (!entry.legacy || entry.id === value)).map((entry) => (
            <option key={entry.id} value={entry.id}>
              {t.flowCategories[entry.id]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

const KIND_TONE: Record<string, string> = { asset: 'bg-asset', liability: 'bg-liability', income: 'bg-flow', expense: 'bg-flow' }

function ReviewStep({ draft, rows, warnings, onRows, onApply, onAgain }: { draft: Snapshot; rows: Row[]; warnings: string[]; onRows: (rows: Row[]) => void; onApply: () => void; onAgain: () => void }) {
  const { t } = useI18n()
  const proposals = useMemo(() => proposeChanges(draft, rows.map((row) => row.line)), [draft, rows])
  const count = rows.filter((row) => row.selected).length
  const patch = (index: number, change: Partial<ImportLine> | { selected: boolean }) =>
    onRows(rows.map((row, at) => (at !== index ? row : 'selected' in change ? { ...row, selected: change.selected } : { ...row, line: { ...row.line, ...change } })))

  return (
    <div className="grid grid-cols-1 gap-4">
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-muted/70 px-4 py-3 text-[15px]">{t.importer.empty}</p>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-muted-foreground">{t.importer.reviewHint}</p>
          <ul className="grid grid-cols-1 gap-2.5">
            {rows.map((row, index) => {
              const { line } = row
              const action = proposals[index]!.action
              const flow = line.kind === 'income' || line.kind === 'expense'
              const label = line.name || (flow ? t.flowCategories[line.category] : t.categories[line.category]) || ''
              return (
                <li key={index} className={cn('glass grid min-w-0 grid-cols-1 gap-2.5 rounded-[1.25rem] p-3.5 transition-opacity', !row.selected && 'opacity-55')}>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={row.selected}
                      aria-label={t.importer.select(label)}
                      className={cn(
                        'relative grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors after:absolute after:-inset-2.5',
                        row.selected ? 'border-transparent bg-primary text-primary-foreground' : 'border-border',
                      )}
                      onClick={() => patch(index, { selected: !row.selected })}
                    >
                      {row.selected && <Check className="size-3.5" strokeWidth={3} />}
                    </button>
                    <span aria-hidden className={cn('size-2 shrink-0 rounded-full', KIND_TONE[line.kind])} />
                    <span className="grid min-w-0 flex-1">
                      <input
                        aria-label={t.importer.nameLabel}
                        className="min-w-0 rounded-lg bg-transparent px-1.5 py-0.5 text-[16px] font-semibold outline-none hover:bg-muted/70 focus:bg-muted focus:ring-2 focus:ring-ring/40"
                        placeholder={flow ? t.flowCategories[line.category] : t.categories[line.category]}
                        value={line.name}
                        onChange={(event) => patch(index, { name: event.target.value })}
                      />
                      <span className="truncate px-1.5 text-[12px] font-bold">
                        <span className={action.type === 'update' ? 'text-flow' : 'text-gain'}>
                          {action.type === 'update' ? t.importer.update(shortMoney(action.previous, line.currency)) : t.importer.add}
                        </span>
                        {line.kind === 'liability' && line.monthlyPayment ? (
                          <span className="font-semibold text-muted-foreground"> · {t.sheet.monthlyPaymentNote(money(line.monthlyPayment, line.currency))}</span>
                        ) : null}
                      </span>
                    </span>
                    <AmountInput id={`import-${index}`} value={line.amount} currency={line.currency} label={t.sheet.amount} className="w-28 sm:w-32" onCommit={(amount) => patch(index, { amount })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-[2.375rem]">
                    <CategorySelect
                      value={line.category}
                      onChange={(category) => {
                        const kind = kindOf(category) ?? line.kind
                        patch(index, { category, kind, frequency: kind === 'income' || kind === 'expense' ? line.frequency : 'monthly' })
                      }}
                    />
                    {flow && (
                      <select
                        aria-label={t.importer.frequencyLabel}
                        className={cn(FIELD, 'h-9 w-auto shrink-0 rounded-full py-0 pr-7 text-[14px] font-semibold')}
                        value={line.frequency}
                        onChange={(event) => patch(index, { frequency: event.target.value as Frequency })}
                      >
                        {(['monthly', 'quarterly', 'annual', ...(line.kind === 'income' ? ['once' as const] : [])] as Frequency[]).map((frequency) => (
                          <option key={frequency} value={frequency}>
                            {t.frequency[frequency]}
                          </option>
                        ))}
                      </select>
                    )}
                    <Segmented<Currency> label={t.common.currency} value={line.currency} options={[['CNY', '¥'], ['USD', '$']]} onChange={(currency) => patch(index, { currency })} />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {warnings.length > 0 && (
        <ul className="grid gap-1 rounded-2xl bg-caution/12 px-4 py-3 text-[13px] leading-relaxed">
          {warnings.map((warning, index) => (
            <li key={index}>{warningText(t, warning)}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-2">
        {rows.length > 0 && (
          <button type="button" className={ACTION} disabled={count === 0} onClick={onApply}>
            {t.importer.apply(count)}
          </button>
        )}
        <button type="button" className={cn(QUIET, 'w-full')} onClick={onAgain}>
          {t.importer.again}
        </button>
      </div>
    </div>
  )
}

/** Screenshot and text import: read with the user's own model key, then review every line before it touches the sheet. */
export function ImportDialog({ open, draft, onOpenChange, onApply }: { open: boolean; draft: Snapshot; onOpenChange: (open: boolean) => void; onApply: (patch: Pick<Snapshot, 'items' | 'flows'>, count: number) => void }) {
  const { t } = useI18n()
  const [settings, setSettings] = useState(loadSettings)
  const [step, setStep] = useState<Step>(() => (isReady(loadSettings()) ? 'input' : 'settings'))
  const [images, setImages] = useState<ImageInput[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const run = useRef(0)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const showError = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  const hideToast = useCallback(() => setToast(null), [])
  const providerName = settings.provider === 'anthropic' ? 'Anthropic Claude' : settings.baseUrl.replace(/^https?:\/\//, '').split('/')[0] || t.importer.setup.openai

  const reset = () => {
    images.forEach((image) => URL.revokeObjectURL(image.preview))
    setImages([])
    setText('')
    setRows([])
    setWarnings([])
    setError(null)
    setStep(isReady(settings) ? 'input' : 'settings')
  }

  const addImages = async (files: File[]) => {
    const picked = files.filter((file) => file.type.startsWith('image/'))
    const read = await Promise.all(picked.map((file) => readImage(file).catch(() => null)))
    setImages((current) => [...current, ...read.filter((image): image is ImageInput => image !== null)].slice(0, 6))
    setError(null)
  }

  useEffect(() => {
    if (!open || step !== 'input') return
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'))
      if (files.length === 0) return
      event.preventDefault()
      void addImages(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const submit = async () => {
    const id = ++run.current
    setStep('loading')
    setError(null)
    try {
      const result = await recognise(settings, { images, text })
      if (id !== run.current) return
      setRows(result.lines.map((line) => ({ line, selected: true })))
      setWarnings(result.warnings)
      setStep('review')
    } catch (failure) {
      if (id !== run.current) return
      setError(errorText(t, failure))
      setStep(failure instanceof ImportError && failure.code === 'auth' ? 'settings' : 'input')
    }
  }

  const title = step === 'settings' ? t.importer.settings : step === 'review' ? t.importer.reviewTitle(rows.length) : t.importer.title
  const backFromSettings = isReady(settings) ? () => setStep('input') : undefined

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          run.current++
          reset()
        }
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[oklch(0.2_0.03_200/0.32)] backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'glass-bar fixed z-50 flex flex-col overflow-hidden border border-(--glass-edge) shadow-[0_30px_80px_-30px_var(--glass-shadow)] outline-none',
            'inset-x-0 bottom-0 max-h-[calc(100dvh-max(24px,env(safe-area-inset-top,0px)))] rounded-t-[1.75rem] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-8',
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(88dvh,820px)] sm:w-[min(600px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:data-[state=open]:zoom-in-95 sm:data-[state=open]:slide-in-from-bottom-0',
          )}
        >
          <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            {step === 'settings' && backFromSettings ? (
              <button type="button" aria-label={t.common.back} className="relative -ml-2 grid size-9 place-items-center rounded-full after:absolute after:-inset-1" onClick={backFromSettings}>
                <ChevronLeft className="size-5.5 text-primary" />
              </button>
            ) : null}
            <Dialog.Title className="min-w-0 flex-1 truncate text-[19px] font-extrabold">{title}</Dialog.Title>
            {step === 'input' && (
              <button type="button" aria-label={t.importer.openSettings} className="glass-capsule relative grid size-9 place-items-center rounded-full after:absolute after:-inset-1" onClick={() => setStep('settings')}>
                <Settings2 className="size-4.5" />
              </button>
            )}
            <Dialog.Close aria-label={t.importer.close} className="glass-capsule relative grid size-9 place-items-center rounded-full after:absolute after:-inset-1">
              <X className="size-4.5" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pt-1" style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
            {step === 'settings' && (
              <>
                {error && (
                  <p role="alert" className="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-[14px] font-semibold text-destructive">
                    {error}
                  </p>
                )}
                <SettingsStep
                  settings={settings}
                  onBack={backFromSettings}
                  onError={showError}
                  onSave={(next) => {
                    setSettings(next)
                    if (next.apiKey) saveSettings(next)
                    if (isReady(next)) {
                      setError(null)
                      setStep('input')
                    }
                  }}
                />
              </>
            )}
            {step === 'input' && (
              <InputStep
                images={images}
                text={text}
                provider={providerName}
                error={error}
                onImages={(files) => void addImages(files)}
                onRemove={(id) =>
                  setImages((current) => {
                    const gone = current.find((image) => image.id === id)
                    if (gone) URL.revokeObjectURL(gone.preview)
                    return current.filter((image) => image.id !== id)
                  })
                }
                onText={setText}
                onSubmit={() => void submit()}
              />
            )}
            {step === 'loading' && (
              <div role="status" className="grid place-items-center gap-3 py-14 text-center">
                <LoaderCircle className="size-8 animate-spin text-primary" />
                <p className="text-[17px] font-bold">{t.importer.recognising}</p>
                <p className="text-[14px] text-muted-foreground">{t.importer.recognisingHint}</p>
                <button
                  type="button"
                  className={cn(QUIET, 'mt-3')}
                  onClick={() => {
                    run.current++
                    setStep('input')
                  }}
                >
                  {t.importer.cancel}
                </button>
              </div>
            )}
            {step === 'review' && (
              <ReviewStep
                draft={draft}
                rows={rows}
                warnings={warnings}
                onRows={setRows}
                onAgain={() => {
                  setRows([])
                  setWarnings([])
                  setStep('input')
                }}
                onApply={() => {
                  const chosen = proposeChanges(draft, rows.map((row) => row.line)).map((proposal, index) => ({ ...proposal, selected: rows[index]!.selected }))
                  onApply(applyProposals(draft, chosen), chosen.filter((proposal) => proposal.selected).length)
                  reset()
                  onOpenChange(false)
                }}
              />
            )}
          </div>
          <Toast toast={toast} onDone={hideToast} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
