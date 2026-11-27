import { describe, expect, it } from 'vitest'
import { parseReceiptText } from './receipt'

describe('收據欄位擷取', () => {
  it('讀取含 10% 與 8% 的收據、店名、日期與免稅登錄', () => {
    const parsed = parseReceiptText(`
ドン・キホーテ 新宿店
東京都新宿区歌舞伎町1-1
2026年11月15日 14:32
バッグ ¥4,400
お菓子 ¥1,080
小計 ¥5,480
消費税（10%） ¥400
消費税（8%） ¥80
合計 ¥5,480
10%対象 ¥4,400
8%対象 ¥1,080
カード番号 **** 2468
免税
`)
    expect(parsed.storeName).toBe('ドン・キホーテ 新宿店')
    expect(parsed.confidence.storeName).toBeGreaterThan(0.8)
    expect(parsed.date).toBe('2026-11-15')
    expect(parsed.refundMarked).toBe(true)
    expect(parsed.category).toBe('mixed')
    expect(parsed.paymentCard).toBe('卡片末四碼 2468')
    expect(parsed.lines).toEqual([
      { id: 'r10-0', rate: 10, inclusive: 4400, exclusive: 4000, tax: 400 },
      { id: 'r8-1', rate: 8, inclusive: 1080, exclusive: 1000, tax: 80 },
    ])
  })

  it('令和日期、單一 10% 稅額與一般物品', () => {
    const parsed = parseReceiptText(`
高島屋 京都店
令和8年11月5日
バッグ ¥55,000
合計 ¥55,000
消費税 10% ¥5,000
`)
    expect(parsed.storeName).toBe('高島屋京都店')
    expect(parsed.date).toBe('2026-11-05')
    expect(parsed.refundMarked).toBe(false)
    expect(parsed.category).toBe('general')
    expect(parsed.lines[0]).toMatchObject({ rate: 10, inclusive: 55000, tax: 5000, exclusive: 50000 })
    expect(parsed.warnings.some((warning) => warning.includes('沒有讀到免稅'))).toBe(true)
  })

  it('全形數字、空白與字母誤認仍可讀出合計與稅', () => {
    const parsed = parseReceiptText(`
ドン・キホ一テ 渋谷店
２Ｏ２６年１１月２Ｏ日
化粧品          ￥８，８ＯＯ
合 計           ￥８，８ＯＯ
内 消費税        ￥８ＯＯ
免 税
`)
    expect(parsed.storeName).toContain('渋谷店')
    expect(parsed.date).toBe('2026-11-20')
    expect(parsed.refundMarked).toBe(true)
    expect(parsed.category).toBe('consumable')
    expect(parsed.lines[0]).toMatchObject({ rate: 10, inclusive: 8800, tax: 800, exclusive: 8000 })
  })

  it('只有食品合計時，用 8% 估計並標低把握', () => {
    const parsed = parseReceiptText(`
セブン-イレブン
2026/11/18
お弁当 ¥540
合計 ¥540
`)
    expect(parsed.storeName).toBe('セブン-イレブン')
    expect(parsed.date).toBe('2026-11-18')
    expect(parsed.category).toBe('consumable')
    expect(parsed.lines[0]).toMatchObject({ rate: 8, inclusive: 540, tax: 40, exclusive: 500 })
    expect(parsed.confidence.rates).toBeLessThan(0.7)
    expect(parsed.confidence.amounts).toBeLessThan(0.7)
  })

  it('対象額是未稅時，用稅額還原含稅', () => {
    const parsed = parseReceiptText(`
成城石井 京都店
R8.11.21
合計 ¥5,990
10%対象 ¥2,500
消費税（10%） ¥250
8%対象 ¥3,000
消費税（8%） ¥240
輸出物品販売場
`)
    expect(parsed.date).toBe('2026-11-21')
    expect(parsed.refundMarked).toBe(true)
    expect(parsed.lines).toEqual([
      { id: 'r10-0', rate: 10, exclusive: 2500, tax: 250, inclusive: 2750 },
      { id: 'r8-1', rate: 8, exclusive: 3000, tax: 240, inclusive: 3240 },
    ])
  })

  it('只有總額與未標稅率的消費稅時，反推 10%', () => {
    const parsed = parseReceiptText(`
無印良品
2026-11-22
合計 ¥11,000
消費税 ¥1,000
`)
    expect(parsed.storeName).toBe('無印良品')
    expect(parsed.confidence.storeName).toBeLessThan(0.7)
    expect(parsed.lines[0]).toMatchObject({ rate: 10, inclusive: 11000, tax: 1000, exclusive: 10000 })
  })

  it('地金會提出不適用的提醒', () => {
    const parsed = parseReceiptText(`
銀座金商
2026年11月2日
金地金 ¥110,000
合計 ¥110,000
消費税 ¥10,000
`)
    expect(parsed.warnings.some((warning) => warning.includes('地金'))).toBe(true)
    expect(parsed.lines[0]?.tax).toBe(10000)
  })
})
