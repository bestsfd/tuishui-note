import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function needsReview(confidence: number): boolean {
  return confidence < 0.7
}

export function formatRate(rate: number): string {
  return `1 日圓 ≈ ${rate.toFixed(4)} 新臺幣`
}

export function safeHttpUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}
