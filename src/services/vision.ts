import { fromInclusive } from '../lib/money'
import type { ParsedReceipt } from '../lib/receipt'
import type { Category, Settings, TaxRate } from '../lib/types'

interface VisionLine {
  rate?: number
  inclusive?: number
  tax?: number
}

interface VisionPayload {
  storeName?: string | null
  date?: string | null
  lines?: VisionLine[]
  refundRegistered?: boolean
  category?: string
  paymentHint?: string | null
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function asRate(value: number | undefined): TaxRate {
  return value === 8 ? 8 : 10
}

function asCategory(value: string | undefined): Category {
  if (value === 'general' || value === 'consumable' || value === 'mixed' || value === 'unknown') return value
  return 'unknown'
}

function toParsed(payload: VisionPayload): ParsedReceipt {
  const lines = (payload.lines ?? [])
    .map((line, index) => {
      const inclusive = Math.round(Number(line.inclusive) || 0)
      if (inclusive <= 0) return null
      const rate = asRate(line.rate)
      const computed = fromInclusive(inclusive, rate)
      const tax = line.tax == null ? computed.tax : Math.round(Number(line.tax))
      return {
        id: `v-${index}`,
        rate,
        inclusive,
        tax,
        exclusive: inclusive - tax,
      }
    })
    .filter((line): line is NonNullable<typeof line> => line != null)
  const refundMarked = Boolean(payload.refundRegistered)
  return {
    storeName: payload.storeName?.trim() || null,
    date: payload.date && /^\d{4}-\d{2}-\d{2}$/.test(payload.date) ? payload.date : null,
    lines,
    category: asCategory(payload.category),
    paymentCard: payload.paymentHint?.trim() || '',
    refundMarked,
    confidence: {
      storeName: payload.storeName ? 0.84 : 0,
      date: payload.date ? 0.84 : 0,
      amounts: lines.length ? 0.8 : 0,
      rates: lines.length ? 0.78 : 0,
      category: payload.category ? 0.74 : 0.35,
      refund: refundMarked ? 0.8 : 0.4,
      card: payload.paymentHint ? 0.7 : 0,
    },
    warnings: ['這筆由你設定的辨識服務讀取，請再對一次收據'],
  }
}

export async function recognizeWithVision(image: Blob, settings: Settings): Promise<ParsedReceipt | null> {
  const key = settings.visionApiKey.trim()
  if (!settings.visionEnabled || !key) return null
  const dataUrl = await blobToDataUrl(image)
  const base = settings.visionBaseUrl.replace(/\/$/, '')
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 25000)
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.visionModel || 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Read this Japanese shopping receipt. Reply with JSON only: {"storeName":"","date":"YYYY-MM-DD","lines":[{"rate":10,"inclusive":0,"tax":0}],"refundRegistered":false,"category":"general|consumable|mixed|unknown","paymentHint":""}. rate is 8 or 10. inclusive is yen including tax. Use null when unknown. category consumable means food, drink, cosmetics or medicine.',
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    })
    if (!response.ok) return null
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    const content = body.choices?.[0]?.message?.content ?? ''
    const json = content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)
    if (!json.startsWith('{')) return null
    return toParsed(JSON.parse(json) as VisionPayload)
  } finally {
    window.clearTimeout(timer)
  }
}
