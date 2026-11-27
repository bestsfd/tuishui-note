import { FALLBACK_JPY_TO_TWD, FALLBACK_RATE_DATE } from '../lib/money'

export interface RateResult {
  rate: number
  source: 'api' | 'fallback'
  updatedAt: string
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('rate')
  return response.json()
}

export async function fetchJpyToTwd(): Promise<RateResult> {
  const errors: unknown[] = []
  try {
    const data = (await readJson('https://latest.currency-api.pages.dev/v1/currencies/jpy.json')) as {
      date?: string
      jpy?: { twd?: number }
    }
    const rate = data.jpy?.twd
    if (typeof rate === 'number' && rate > 0) {
      return { rate, source: 'api', updatedAt: data.date ?? new Date().toISOString().slice(0, 10) }
    }
  } catch (error) {
    errors.push(error)
  }
  try {
    const data = (await readJson('https://open.er-api.com/v6/latest/JPY')) as { rates?: { TWD?: number } }
    const rate = data.rates?.TWD
    if (typeof rate === 'number' && rate > 0) {
      return { rate, source: 'api', updatedAt: new Date().toISOString().slice(0, 10) }
    }
  } catch (error) {
    errors.push(error)
  }
  if (errors.length === 0) throw new Error('rate')
  return { rate: FALLBACK_JPY_TO_TWD, source: 'fallback', updatedAt: FALLBACK_RATE_DATE }
}
