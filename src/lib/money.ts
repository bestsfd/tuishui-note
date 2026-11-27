import type { TaxRate } from './types'

export const MIN_TAX_EXCLUSIVE = 5_000
export const CLOSE_SHORTFALL = 2_000
export const HIGH_VALUE_EXCLUSIVE = 1_000_000
export const FALLBACK_JPY_TO_TWD = 0.2068
export const FALLBACK_RATE_DATE = '2026-11-27'

export function fromInclusive(inclusive: number, rate: TaxRate): {
  inclusive: number
  exclusive: number
  tax: number
} {
  const tax = Math.round((inclusive * rate) / (100 + rate))
  return { inclusive, tax, exclusive: inclusive - tax }
}

export function fromExclusive(exclusive: number, rate: TaxRate): {
  inclusive: number
  exclusive: number
  tax: number
} {
  const tax = Math.round((exclusive * rate) / 100)
  return { exclusive, tax, inclusive: exclusive + tax }
}

export function formatYen(value: number): string {
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '-' : ''
  return `${sign}¥${Math.abs(rounded).toLocaleString('zh-Hant')}`
}

export function formatTwd(value: number): string {
  return `新臺幣 ${Math.round(value).toLocaleString('zh-Hant')}`
}

export function toTwd(jpy: number, jpyToTwd: number): number {
  return Math.round(jpy * jpyToTwd)
}

export function shortfallAdvice(shortfall: number): string {
  if (shortfall <= 0) return '已達同一店、同一日未稅 5,000 日圓'
  if (shortfall <= CLOSE_SHORTFALL) {
    return `再買未稅 ${formatYen(shortfall)} 就達到當日最低門檻`
  }
  return `此店當日未稅還差 ${formatYen(shortfall)} 才達最低門檻`
}
