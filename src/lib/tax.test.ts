import { describe, expect, it } from 'vitest'
import { fromExclusive, fromInclusive, shortfallAdvice } from './money'
import { evaluatePurchases } from './tax'
import type { Purchase } from './types'

const TODAY = '2026-11-27'

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
      storeName: 0.9,
      date: 0.9,
      amounts: 0.9,
      rates: 0.9,
      category: 0.9,
      refund: 0.9,
      card: 0,
    },
    warnings: [],
    createdAt: TODAY,
    updatedAt: TODAY,
    ...partial,
  }
}

describe('退稅試算', () => {
  it('含稅 5,500 日圓、稅率 10% 時未稅正好達門檻', () => {
    const money = fromInclusive(5500, 10)
    expect(money).toEqual({ inclusive: 5500, tax: 500, exclusive: 5000 })
    const summary = evaluatePurchases(
      [purchase({ id: 'a', storeName: '大丸', date: '2026-11-20', lines: [{ id: 'l', ...money, rate: 10 }] })],
      { feePercent: 0, today: TODAY, jpyToTwd: 0.2068 },
    )
    expect(summary.items[0]?.qualified).toBe(true)
    expect(summary.items[0]?.netRefund).toBe(500)
    expect(summary.estimatedRefundTwd).toBe(103)
    expect(summary.items[0]?.deadline).toBe('2027-02-18')
  })

  it('含稅 5,000 日圓只差一點，會提示再買多少', () => {
    const money = fromInclusive(5000, 10)
    expect(money.exclusive).toBe(4545)
    expect(money.tax).toBe(455)
    const summary = evaluatePurchases(
      [purchase({ id: 'a', storeName: '雜貨店', date: '2026-11-20', lines: [{ id: 'l', ...money, rate: 10 }] })],
      { feePercent: 0, today: TODAY, jpyToTwd: null },
    )
    const item = summary.items[0]
    expect(item?.qualified).toBe(false)
    expect(item?.shortfall).toBe(455)
    expect(item?.netRefund).toBe(0)
    expect(item?.reason).toBe(shortfallAdvice(455))
    expect(item?.reason).toContain('再買未稅')
    expect(item?.reason).toContain('¥455')
  })

  it('同一店同一日的兩張收據合併判斷，不同店或不同日不合併', () => {
    const first = fromExclusive(3000, 10)
    const second = fromExclusive(2500, 8)
    const otherStore = fromExclusive(4000, 10)
    const otherDay = fromExclusive(4000, 10)
    const summary = evaluatePurchases(
      [
        purchase({
          id: 'a',
          storeName: '大丸 京都店',
          date: '2026-11-21',
          lines: [{ id: '1', rate: 10, ...first }],
        }),
        purchase({
          id: 'b',
          storeName: '大丸京都店',
          date: '2026-11-21',
          lines: [{ id: '2', rate: 8, ...second }],
        }),
        purchase({
          id: 'c',
          storeName: '高島屋',
          date: '2026-11-21',
          lines: [{ id: '3', rate: 10, ...otherStore }],
        }),
        purchase({
          id: 'd',
          storeName: '大丸京都店',
          date: '2026-11-22',
          lines: [{ id: '4', rate: 10, ...otherDay }],
        }),
      ],
      { feePercent: 0, today: TODAY, jpyToTwd: null },
    )
    const byId = Object.fromEntries(summary.items.map((item) => [item.purchase.id, item]))
    expect(byId.a?.qualified).toBe(true)
    expect(byId.b?.qualified).toBe(true)
    expect(byId.a?.netRefund).toBe(first.tax)
    expect(byId.b?.netRefund).toBe(second.tax)
    expect(byId.c?.qualified).toBe(false)
    expect(byId.d?.qualified).toBe(false)
    expect(byId.c?.shortfall).toBe(1000)
  })

  it('食品 8% 與雜貨 10% 分開算稅，再合併看門檻', () => {
    const food = fromExclusive(3000, 8)
    const goods = fromExclusive(2500, 10)
    expect(food).toEqual({ exclusive: 3000, tax: 240, inclusive: 3240 })
    expect(goods).toEqual({ exclusive: 2500, tax: 250, inclusive: 2750 })
    const summary = evaluatePurchases(
      [
        purchase({
          id: 'mix',
          storeName: '成城石井',
          date: '2026-11-21',
          category: 'mixed',
          lines: [
            { id: 'f', rate: 8, ...food },
            { id: 'g', rate: 10, ...goods },
          ],
        }),
      ],
      { feePercent: 0, today: TODAY, jpyToTwd: null },
    )
    expect(summary.items[0]?.exclusive).toBe(5500)
    expect(summary.items[0]?.tax).toBe(490)
    expect(summary.items[0]?.qualified).toBe(true)
    expect(summary.estimatedRefund).toBe(490)
  })

  it('手續費從消費稅扣除，未達門檻時不扣', () => {
    const money = fromExclusive(10000, 10)
    const summary = evaluatePurchases(
      [
        purchase({
          id: 'fee',
          storeName: '百貨',
          date: '2026-11-02',
          lines: [{ id: 'l', rate: 10, ...money }],
        }),
        purchase({
          id: 'small',
          storeName: '小店',
          date: '2026-11-02',
          lines: [{ id: 's', rate: 10, ...fromExclusive(1000, 10) }],
        }),
      ],
      { feePercent: 10, today: TODAY, jpyToTwd: 0.2068 },
    )
    const feeItem = summary.items.find((item) => item.purchase.id === 'fee')
    expect(feeItem?.grossRefund).toBe(1000)
    expect(feeItem?.fee).toBe(100)
    expect(feeItem?.netRefund).toBe(900)
    expect(summary.items.find((item) => item.purchase.id === 'small')?.fee).toBe(0)
    expect(summary.estimatedRefundTwd).toBe(186)
  })

  it('單筆手續費可以蓋過整體設定', () => {
    const money = fromExclusive(10000, 10)
    const summary = evaluatePurchases(
      [
        purchase({
          id: 'fee',
          storeName: '百貨',
          date: '2026-11-02',
          feePercent: 0,
          lines: [{ id: 'l', rate: 10, ...money }],
        }),
      ],
      { feePercent: 15, today: TODAY, jpyToTwd: null },
    )
    expect(summary.items[0]?.fee).toBe(0)
    expect(summary.items[0]?.netRefund).toBe(1000)
  })

  it('11月1日以前的購買不併入新制門檻', () => {
    const summary = evaluatePurchases(
      [
        purchase({
          id: 'old',
          storeName: '舊制度店',
          date: '2026-10-31',
          lines: [{ id: 'o', rate: 10, ...fromExclusive(20000, 10) }],
        }),
        purchase({
          id: 'new',
          storeName: '舊制度店',
          date: '2026-11-01',
          lines: [{ id: 'n', rate: 10, ...fromExclusive(1000, 10) }],
        }),
      ],
      { feePercent: 0, today: TODAY, jpyToTwd: null },
    )
    expect(summary.items.find((item) => item.purchase.id === 'old')?.beforeReform).toBe(true)
    expect(summary.items.find((item) => item.purchase.id === 'old')?.netRefund).toBe(0)
    expect(summary.items.find((item) => item.purchase.id === 'new')?.qualified).toBe(false)
    expect(summary.items.find((item) => item.purchase.id === 'new')?.deadline).toBe('2027-01-30')
  })

  it('未列入試算的收據不會幫同一天湊門檻', () => {
    const summary = evaluatePurchases(
      [
        purchase({
          id: 'gold',
          storeName: '金行',
          date: '2026-11-03',
          eligible: false,
          lines: [{ id: 'g', rate: 10, ...fromExclusive(20000, 10) }],
        }),
        purchase({
          id: 'cup',
          storeName: '金行',
          date: '2026-11-03',
          lines: [{ id: 'c', rate: 10, ...fromExclusive(3000, 10) }],
        }),
      ],
      { feePercent: 0, today: TODAY, jpyToTwd: null },
    )
    expect(summary.items.find((item) => item.purchase.id === 'cup')?.qualified).toBe(false)
    expect(summary.items.find((item) => item.purchase.id === 'cup')?.shortfall).toBe(2000)
    expect(summary.pendingCount).toBe(2)
  })

  it('差很多時用另一句提醒，而不是「再買一點」', () => {
    expect(shortfallAdvice(2000)).toContain('再買未稅')
    expect(shortfallAdvice(2001)).toContain('還差')
    expect(shortfallAdvice(0)).toContain('已達')
  })
})
