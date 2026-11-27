import { daysBetween, exportDeadline, REFORM_DATE } from './dates'
import { MIN_TAX_EXCLUSIVE, shortfallAdvice, toTwd } from './money'
import type { Purchase } from './types'

export interface StoreDay {
  key: string
  storeName: string
  date: string
  exclusive: number
  qualified: boolean
  shortfall: number
  purchaseIds: string[]
}

export interface EvaluatedPurchase {
  purchase: Purchase
  spend: number
  exclusive: number
  tax: number
  qualified: boolean
  shortfall: number
  grossRefund: number
  fee: number
  netRefund: number
  deadline: string
  daysToDeadline: number | null
  beforeReform: boolean
  reason: string | null
}

export interface RefundSummary {
  storeDays: StoreDay[]
  items: EvaluatedPurchase[]
  spend: number
  estimatedRefund: number
  estimatedRefundTwd: number | null
  pendingCount: number
}

export function normalizeStoreName(name: string): string {
  return name.normalize('NFKC').replace(/\s+/g, '').toLowerCase()
}

export function storeDayKey(storeName: string, date: string): string {
  return `${normalizeStoreName(storeName)}|${date}`
}

function sumLines(purchase: Purchase): { spend: number; exclusive: number; tax: number } {
  return purchase.lines.reduce(
    (total, line) => ({
      spend: total.spend + line.inclusive,
      exclusive: total.exclusive + line.exclusive,
      tax: total.tax + line.tax,
    }),
    { spend: 0, exclusive: 0, tax: 0 },
  )
}

export function evaluatePurchases(
  purchases: Purchase[],
  options: { feePercent: number; today: string; jpyToTwd: number | null },
): RefundSummary {
  const groups = new Map<string, StoreDay>()
  for (const purchase of purchases) {
    if (!purchase.eligible || purchase.date < REFORM_DATE || !purchase.date) continue
    const key = storeDayKey(purchase.storeName, purchase.date)
    const amounts = sumLines(purchase)
    const current = groups.get(key) ?? {
      key,
      storeName: purchase.storeName.trim(),
      date: purchase.date,
      exclusive: 0,
      qualified: false,
      shortfall: 0,
      purchaseIds: [],
    }
    current.exclusive += amounts.exclusive
    current.purchaseIds.push(purchase.id)
    current.storeName = purchase.storeName.trim() || current.storeName
    groups.set(key, current)
  }

  for (const group of groups.values()) {
    group.qualified = group.exclusive >= MIN_TAX_EXCLUSIVE
    group.shortfall = group.qualified ? 0 : MIN_TAX_EXCLUSIVE - group.exclusive
  }

  const items = purchases.map((purchase) => {
    const amounts = sumLines(purchase)
    const beforeReform = Boolean(purchase.date) && purchase.date < REFORM_DATE
    const group = purchase.eligible && !beforeReform ? groups.get(storeDayKey(purchase.storeName, purchase.date)) : undefined
    const qualified = Boolean(group?.qualified)
    const shortfall = group?.shortfall ?? 0
    const grossRefund = qualified ? amounts.tax : 0
    const feePercent = purchase.feePercent ?? options.feePercent
    const fee = qualified ? Math.round((grossRefund * feePercent) / 100) : 0
    const deadline = purchase.date ? exportDeadline(purchase.date) : ''
    let reason: string | null = null
    if (!purchase.eligible) reason = '這筆沒有列入退稅試算'
    else if (beforeReform) reason = '購買日早於 2026年11月1日，不適用這次的退稅方式'
    else if (!qualified) reason = shortfallAdvice(shortfall)
    return {
      purchase,
      spend: amounts.spend,
      exclusive: amounts.exclusive,
      tax: amounts.tax,
      qualified,
      shortfall,
      grossRefund,
      fee,
      netRefund: grossRefund - fee,
      deadline,
      daysToDeadline: deadline ? daysBetween(options.today, deadline) : null,
      beforeReform,
      reason,
    }
  })

  const estimatedRefund = items.reduce((sum, item) => sum + item.netRefund, 0)
  return {
    storeDays: [...groups.values()],
    items,
    spend: items.reduce((sum, item) => sum + item.spend, 0),
    estimatedRefund,
    estimatedRefundTwd: options.jpyToTwd == null ? null : toTwd(estimatedRefund, options.jpyToTwd),
    pendingCount: purchases.filter((purchase) => purchase.status !== 'customs' && purchase.status !== 'refunded').length,
  }
}
