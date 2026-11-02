import Anthropic from '@anthropic-ai/sdk'
import type { ImageInput } from './image'
import { parseModelOutput } from './parse'
import { OUTPUT_SCHEMA, SYSTEM_PROMPT } from './prompt'
import type { AiSettings } from './settings'
import type { ParseResult } from './types'

/** Error codes the UI turns into messages; the raw provider message is kept for the details line. */
export type ImportErrorCode = 'auth' | 'rate' | 'network' | 'refusal' | 'truncated' | 'format' | 'provider'

export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    detail = '',
  ) {
    super(detail || code)
  }
}

export interface Request {
  images: ImageInput[]
  text: string
}

const userText = (text: string, imageCount: number) =>
  [
    imageCount > 0 ? `${imageCount} screenshot(s) attached.` : '',
    text.trim() ? `Pasted text:\n<pasted>\n${text.trim()}\n</pasted>` : '',
    'Extract the balances and flows as instructed.',
  ]
    .filter(Boolean)
    .join('\n\n')

function anthropicClient(settings: AiSettings) {
  // The key never leaves this browser except in the request to Anthropic; there is no server of ours in between.
  return new Anthropic({ apiKey: settings.apiKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 1 })
}

function rethrow(error: unknown): never {
  if (error instanceof ImportError) throw error
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw new ImportError('auth', error.message)
  if (error instanceof Anthropic.RateLimitError) throw new ImportError('rate', error.message)
  if (error instanceof Anthropic.APIConnectionError) throw new ImportError('network', error.message)
  if (error instanceof Anthropic.APIError) throw new ImportError('provider', error.message)
  if (error instanceof TypeError) throw new ImportError('network', error.message)
  throw new ImportError('provider', error instanceof Error ? error.message : String(error))
}

async function recogniseWithAnthropic(settings: AiSettings, request: Request): Promise<ParseResult> {
  const client = anthropicClient(settings)
  const response = await client.beta.messages.create({
    model: settings.model.trim(),
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> } },
    messages: [
      {
        role: 'user',
        content: [
          ...request.images.map((image) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: image.mediaType, data: image.data } })),
          { type: 'text' as const, text: userText(request.text, request.images.length) },
        ],
      },
    ],
  })
  if (response.stop_reason === 'refusal') throw new ImportError('refusal')
  if (response.stop_reason === 'max_tokens') throw new ImportError('truncated')
  const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
  return parse(text)
}

const endpoint = (settings: AiSettings, path: string) => `${settings.baseUrl.trim().replace(/\/+$/, '')}${path}`

async function openaiFetch(settings: AiSettings, path: string, init?: RequestInit) {
  const response = await fetch(endpoint(settings, path), {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}`, ...init?.headers },
  })
  if (response.ok) return response
  const detail = await response.text().catch(() => '')
  if (response.status === 401 || response.status === 403) throw new ImportError('auth', detail)
  if (response.status === 429) throw new ImportError('rate', detail)
  throw new ImportError('provider', `${response.status} ${detail}`.slice(0, 300))
}

async function recogniseWithOpenAI(settings: AiSettings, request: Request): Promise<ParseResult> {
  const response = await openaiFetch(settings, '/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: settings.model.trim(),
      // Plain JSON mode is the most widely supported option across compatible providers; the schema goes in the prompt.
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nJSON schema:\n${JSON.stringify(OUTPUT_SCHEMA)}` },
        {
          role: 'user',
          content: [
            ...request.images.map((image) => ({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.data}` } })),
            { type: 'text', text: userText(request.text, request.images.length) },
          ],
        },
      ],
    }),
  })
  const body = (await response.json()) as { choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[] }
  const choice = body.choices?.[0]
  if (choice?.message?.refusal) throw new ImportError('refusal', choice.message.refusal)
  if (choice?.finish_reason === 'length') throw new ImportError('truncated')
  return parse(choice?.message?.content ?? '')
}

function parse(text: string): ParseResult {
  try {
    return parseModelOutput(text)
  } catch {
    throw new ImportError('format', text.slice(0, 200))
  }
}

/** Sends the screenshots and text to the provider the user chose and returns validated lines. */
export async function recognise(settings: AiSettings, request: Request): Promise<ParseResult> {
  try {
    return settings.provider === 'anthropic' ? await recogniseWithAnthropic(settings, request) : await recogniseWithOpenAI(settings, request)
  } catch (error) {
    rethrow(error)
  }
}

/** A cheap call that proves the key, model and endpoint work, without sending any financial data. */
export async function testConnection(settings: AiSettings): Promise<void> {
  try {
    if (settings.provider === 'anthropic') await anthropicClient(settings).models.retrieve(settings.model.trim())
    else await openaiFetch(settings, '/models')
  } catch (error) {
    rethrow(error)
  }
}
