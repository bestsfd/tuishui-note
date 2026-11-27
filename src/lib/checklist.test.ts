import { describe, expect, it } from 'vitest'
import { buildChecklist } from './checklist'
import { fromExclusive } from './money'
import { evaluatePurchases } from './tax'
import type { Purchase, Trip } from './types'

const trip: Trip = { name: '京都', departureDate: '2026-12-20', airport: '關西機場' }

function purchase(partial: Partial<Purchase> & Pick<Purchase, 'id' | 'storeName' | 'date' | 'lines'>): Purchase {
  return {
    category: 'general',
    paymentCard: '',
    status: 'registered',
    refundMarkedOnReceipt: true,
    eligible: true,
    feePercent: null,
    photoId: null,
    operatorUrl: '',
    confidence: {
      storeName: 1,
      date: 1,
      amounts: 1,
      rates: 1,
      category: 1,
      refund: 1,
      card: 0,
    },
    warnings: [],
    createdAt: '2026-11-27',
    updatedAt: '2026-11-27',
    ...partial,
  }
}

describe('出境前檢查', () => {
  it('依收據產生消耗品、門檻與尚未確認，並保留固定步驟', () => {
    const purchases = [
      purchase({
        id: 'food',
        storeName: '成城石井',
        date: '2026-11-21',
        category: 'consumable',
        status: 'unfiled',
        lines: [{ id: 'f', rate: 8, ...fromExclusive(6000, 8) }],
      }),
      purchase({
        id: 'small',
        storeName: '無印良品',
        date: '2026-11-22',
        lines: [{ id: 's', rate: 10, ...fromExclusive(4000, 10) }],
      }),
    ]
    const summary = evaluatePurchases(purchases, { feePercent: 0, today: '2026-11-27', jpyToTwd: null })
    const list = buildChecklist({ trip, evaluated: summary.items, today: '2026-11-27' })
    const titles = list.map((item) => item.title).join('\n')
    expect(titles).toContain('不要拆')
    expect(titles).toContain('最低門檻')
    expect(titles).toContain('沒有完成海關確認')
    expect(titles).toContain('先辦確認，再託運行李')
    expect(titles).toContain('同一張收據')
    expect(list.find((item) => item.id === 'vjw')?.detail).toContain('關西')
    expect(list.some((item) => item.detail.includes('政府不另收手續費'))).toBe(true)
  })
})
