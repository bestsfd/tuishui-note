import { fromInclusive } from './money'
import type { Category, FieldConfidence, MoneyLine, TaxRate } from './types'

export interface ParsedReceipt {
  storeName: string | null
  date: string | null
  lines: MoneyLine[]
  category: Category
  paymentCard: string
  refundMarked: boolean
  confidence: FieldConfidence
  warnings: string[]
}

interface TaxHit {
  rate: TaxRate | null
  tax: number
}

interface TargetHit {
  rate: TaxRate
  amount: number
}

function close(left: number, right: number, tolerance = 3): boolean {
  return Math.abs(left - right) <= tolerance
}

function parseYen(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0 || value > 50_000_000) return null
  return Math.round(value)
}

function fixNumericTokens(text: string): string {
  return text.replace(/[0-9OIlZSBG][0-9OIlZSBG,]{2,}/g, (token) =>
    token
      .replace(/[Oo]/g, '0')
      .replace(/[Il]/g, '1')
      .replace(/Z/g, '2')
      .replace(/S/g, '5')
      .replace(/G/g, '6')
      .replace(/B/g, '8'),
  )
}

export function normalizeReceiptText(input: string): string {
  return fixNumericTokens(
    input
      .replace(/\r/g, '')
      .normalize('NFKC')
      .replace(/[¥￥\\]/g, '¥')
      .replace(/[－—–−]/g, '-')
      .replace(/¥\s+/g, '¥')
      .replace(/(\d),\s+(\d)/g, '$1,$2')
      .replace(/([\u4e00-\u9fff])[ \t\u3000]+(?=[\u4e00-\u9fff])/g, '$1'),
  )
}

function amountIn(line: string): number | null {
  const yen = [...line.matchAll(/¥([0-9][0-9,]*)/g)]
  if (yen.length > 0) return parseYen(yen[yen.length - 1]?.[1] ?? '')
  const bare = line.match(/(?:^|\s)([0-9][0-9,]{2,})\s*$/)
  if (!bare) return null
  return parseYen(bare[1] ?? '')
}

function lineTotalScore(line: string): number {
  if (/対象|点数|個数|個$/.test(line)) return 0
  if (/税込合計|含税合計|領収金額|総合計/.test(line)) return 100
  if (/お会計/.test(line)) return 90
  if (/小計/.test(line)) return 30
  if (/合計/.test(line)) return 80
  return 0
}

function extractTotal(lines: string[]): number | null {
  let best: { score: number; index: number; amount: number } | null = null
  lines.forEach((line, index) => {
    const score = lineTotalScore(line)
    if (score === 0) return
    const amount = amountIn(line) ?? (lines[index + 1] ? amountIn(lines[index + 1] ?? '') : null)
    if (amount == null) return
    if (!best || score > best.score || (score === best.score && index > best.index)) {
      best = { score, index, amount }
    }
  })
  return best?.amount ?? null
}

function collectTaxes(lines: string[]): TaxHit[] {
  const found: TaxHit[] = []
  for (const line of lines) {
    const rated =
      /(?:消費税|内消費税)[（(]\s*(10|8)\s*%\s*[）)]\s*¥([0-9,]+)|(?:消費税|内消費税)\s*(10|8)\s*%\s*¥([0-9,]+)|(10|8)\s*%\s*(?:消費税|内消費税)\s*¥([0-9,]+)/g
    const ratedHits = [...line.matchAll(rated)]
    if (ratedHits.length > 0) {
      for (const hit of ratedHits) {
        const rate = Number(hit[1] || hit[3] || hit[5]) as TaxRate
        const tax = parseYen(hit[2] || hit[4] || hit[6] || '')
        if (tax != null) found.push({ rate, tax })
      }
      continue
    }
    if (/対象/.test(line) && !/消費税|内消費税|内税/.test(line)) continue
    const plain = /(?:内消費税|消費税|内税)\s*¥([0-9,]+)/g
    for (const hit of line.matchAll(plain)) {
      const tax = parseYen(hit[1] ?? '')
      if (tax != null) found.push({ rate: null, tax })
    }
  }
  return dedupeTaxes(found)
}

function dedupeTaxes(hits: TaxHit[]): TaxHit[] {
  const seen = new Set<string>()
  const result: TaxHit[] = []
  for (const hit of hits) {
    const key = `${hit.rate ?? 'x'}:${hit.tax}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(hit)
  }
  return result
}

function collectTargets(lines: string[]): TargetHit[] {
  const found: TargetHit[] = []
  const patterns = [
    /(10|8)\s*%\s*対象(?:額)?\s*¥([0-9,]+)/g,
    /対象(?:額)?[（(]\s*(10|8)\s*%\s*[）)]\s*¥([0-9,]+)/g,
  ]
  for (const line of lines) {
    for (const pattern of patterns) {
      for (const hit of line.matchAll(pattern)) {
        const rate = Number(hit[1]) as TaxRate
        const amount = parseYen(hit[2] ?? '')
        if (amount != null) found.push({ rate, amount })
      }
    }
  }
  const seen = new Set<string>()
  return found.filter((hit) => {
    const key = `${hit.rate}:${hit.amount}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function lineFromInclusive(rate: TaxRate, inclusive: number, tax: number | null, index: number): MoneyLine {
  const computed = fromInclusive(inclusive, rate)
  const usedTax = tax ?? computed.tax
  return {
    id: `r${rate}-${index}`,
    rate,
    inclusive,
    tax: usedTax,
    exclusive: inclusive - usedTax,
  }
}

function lineFromExclusive(rate: TaxRate, exclusive: number, tax: number, index: number): MoneyLine {
  return {
    id: `r${rate}-${index}`,
    rate,
    inclusive: exclusive + tax,
    exclusive,
    tax,
  }
}

function taxFor(rate: TaxRate, taxes: TaxHit[]): number | null {
  return taxes.find((hit) => hit.rate === rate)?.tax ?? null
}

function buildLines(
  total: number | null,
  taxes: TaxHit[],
  targets: TargetHit[],
  food: boolean,
): { lines: MoneyLine[]; amountConfidence: number; rateConfidence: number; warnings: string[] } {
  const warnings: string[] = []
  const targetSum = targets.reduce((sum, hit) => sum + hit.amount, 0)
  const taxSum = taxes.reduce((sum, hit) => sum + hit.tax, 0)

  if (targets.length > 0 && total != null && close(targetSum, total)) {
    return {
      lines: targets.map((target, index) =>
        lineFromInclusive(target.rate, target.amount, taxFor(target.rate, taxes), index),
      ),
      amountConfidence: taxes.length > 0 ? 0.9 : 0.74,
      rateConfidence: 0.9,
      warnings,
    }
  }

  if (targets.length > 0 && taxSum > 0 && (total == null || close(targetSum + taxSum, total))) {
    return {
      lines: targets.map((target, index) => {
        const tax = taxFor(target.rate, taxes) ?? fromInclusive(target.amount, target.rate).tax
        return lineFromExclusive(target.rate, target.amount, tax, index)
      }),
      amountConfidence: 0.88,
      rateConfidence: 0.9,
      warnings,
    }
  }

  const rated = taxes.filter((hit): hit is { rate: TaxRate; tax: number } => hit.rate != null)
  if (rated.length > 0 && total != null && rated.length === 1) {
    const rate = rated[0].rate
    return {
      lines: [lineFromInclusive(rate, total, rated[0].tax, 0)],
      amountConfidence: 0.9,
      rateConfidence: 0.9,
      warnings,
    }
  }

  if (rated.length > 1) {
    const lines = rated.map((hit, index) => {
      const exclusive = Math.round((hit.tax * 100) / hit.rate)
      return lineFromExclusive(hit.rate, exclusive, hit.tax, index)
    })
    const inclusiveSum = lines.reduce((sum, line) => sum + line.inclusive, 0)
    const aligned = total == null || close(inclusiveSum, total, 5)
    if (!aligned) warnings.push('各稅率加總和收據總額對不上，請核對')
    return {
      lines,
      amountConfidence: aligned ? 0.84 : 0.58,
      rateConfidence: 0.86,
      warnings,
    }
  }

  const plain = taxes.find((hit) => hit.rate == null)
  if (plain && total != null) {
    const ratio = plain.tax / total
    const distance10 = Math.abs(ratio - 10 / 110)
    const distance8 = Math.abs(ratio - 8 / 108)
    const rate: TaxRate = distance8 + 0.002 < distance10 ? 8 : 10
    const clean = Math.min(distance10, distance8) < 0.008
    if (!clean) warnings.push('稅率是依稅額反推的，請核對')
    return {
      lines: [lineFromInclusive(rate, total, plain.tax, 0)],
      amountConfidence: 0.8,
      rateConfidence: clean ? 0.62 : 0.4,
      warnings,
    }
  }

  if (total != null) {
    const rate: TaxRate = food ? 8 : 10
    warnings.push('收據沒有分開寫稅額，稅率是估計的，請核對')
    return {
      lines: [lineFromInclusive(rate, total, null, 0)],
      amountConfidence: 0.5,
      rateConfidence: 0.42,
      warnings,
    }
  }

  warnings.push('沒有讀到合計金額')
  return { lines: [], amountConfidence: 0, rateConfidence: 0, warnings }
}

function isoFrom(year: number, month: string, day: string): string | null {
  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null
  const date = new Date(Date.UTC(year, monthNumber - 1, dayNumber))
  if (date.getUTCMonth() !== monthNumber - 1 || date.getUTCDate() !== dayNumber) return null
  const mm = String(monthNumber).padStart(2, '0')
  const dd = String(dayNumber).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function extractDate(lines: string[]): { date: string | null; confidence: number } {
  for (const rawLine of lines) {
    const line = rawLine.replace(/(\d)O/g, '$10').replace(/O(\d)/g, '0$1')
    if (/期限|有効|誕生日|生年月日/.test(line)) continue
    const reiwa = line.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/)
    if (reiwa) {
      const iso = isoFrom(2018 + Number(reiwa[1]), reiwa[2] ?? '', reiwa[3] ?? '')
      if (iso) return { date: iso, confidence: 0.93 }
    }
    const shortReiwa = line.match(/R\s*(\d{1,2})[./-](\d{1,2})[./-](\d{1,2})/)
    if (shortReiwa) {
      const iso = isoFrom(2018 + Number(shortReiwa[1]), shortReiwa[2] ?? '', shortReiwa[3] ?? '')
      if (iso) return { date: iso, confidence: 0.86 }
    }
    const western = line.match(/(20\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})/)
    if (western) {
      const iso = isoFrom(Number(western[1]), western[2] ?? '', western[3] ?? '')
      if (iso) return { date: iso, confidence: 0.92 }
    }
  }
  return { date: null, confidence: 0 }
}

function extractStore(lines: string[]): { name: string | null; confidence: number } {
  const candidates: { name: string; score: number }[] = []
  lines.slice(0, 8).forEach((raw, index) => {
    const name = raw.trim()
    if (name.length < 2 || name.length > 36) return
    if (/合計|消費税|小計|領収|レシート|毎度|ありがとう|登録|電話|TEL|FAX|〒|対象|免税/.test(name)) return
    if (/20\d{2}\s*年|令和|^\d{4}[./-]/.test(name)) return
    if (/[都道府県].*\d/.test(name)) return
    if (!/[\u3040-\u30ff\u4e00-\u9fffA-Za-z]/.test(name)) return
    let score = 50 - index * 4
    if (/店|株式会社|百貨/.test(name)) score += 40
    candidates.push({ name, score })
  })
  candidates.sort((left, right) => right.score - left.score)
  const best = candidates[0]
  if (!best) return { name: null, confidence: 0 }
  return {
    name: best.name,
    confidence: /店|株式会社|百貨/.test(best.name) ? 0.86 : 0.52,
  }
}

function extractCategory(text: string, lines: MoneyLine[]): { category: Category; confidence: number } {
  const consumable = /食品|食料|菓子|スイーツ|ドリンク|飲料|お茶|コーヒー|弁当|化粧品|コスメ|薬品|医薬|シャンプー|チョコ|牛乳|ビール|ワイン|酒|パン/.test(text)
  const general = /衣料|洋服|バッグ|靴|雑貨|家電|玩具|文房具/.test(text)
  if (consumable && general) return { category: 'mixed', confidence: 0.8 }
  if (consumable) return { category: 'consumable', confidence: 0.82 }
  if (general) return { category: 'general', confidence: 0.78 }
  const rates = new Set(lines.map((line) => line.rate))
  if (rates.size === 1 && rates.has(8)) return { category: 'consumable', confidence: 0.48 }
  if (lines.length > 0) return { category: 'general', confidence: 0.4 }
  return { category: 'unknown', confidence: 0 }
}

function extractCard(text: string): { paymentCard: string; confidence: number } {
  if (/現金/.test(text)) return { paymentCard: '現金', confidence: 0.84 }
  const last4 = text.match(/(?:下4桁|末尾|番号)[^0-9]{0,8}([0-9]{4})/) ?? text.match(/[*＊Xx]{2,}\s*([0-9]{4})/)
  if (last4?.[1]) return { paymentCard: `卡片末四碼 ${last4[1]}`, confidence: 0.74 }
  if (/クレジット|カード/.test(text)) return { paymentCard: '信用卡', confidence: 0.5 }
  return { paymentCard: '', confidence: 0 }
}

export function parseReceiptText(input: string): ParsedReceipt {
  const normalized = normalizeReceiptText(input)
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const warnings: string[] = []
  const store = extractStore(lines)
  const date = extractDate(lines)
  const total = extractTotal(lines)
  const taxes = collectTaxes(lines)
  const targets = collectTargets(lines)
  const food = /食品|食料|菓子|スイーツ|ドリンク|飲料|お茶|コーヒー|弁当|パン|牛乳/.test(normalized)
  const built = buildLines(total, taxes, targets, food)
  const category = extractCategory(normalized, built.lines)
  const card = extractCard(normalized)
  const refundMarked = /免税|輸出物品|リファンド|タックスフリー|tax\s*-?\s*free|refund/i.test(normalized)

  if (!store.name) warnings.push('沒有讀到店名')
  if (!date.date) warnings.push('沒有讀到購買日期')
  if (/地金|金塊|金貨|白金貨|プラチナ/.test(normalized)) {
    warnings.push('金與白金地金、金幣不適用退稅')
  }
  if (!refundMarked) warnings.push('收據上沒有讀到免稅或退稅登錄字樣')

  return {
    storeName: store.name,
    date: date.date,
    lines: built.lines,
    category: category.category,
    paymentCard: card.paymentCard,
    refundMarked,
    confidence: {
      storeName: store.confidence,
      date: date.confidence,
      amounts: built.amountConfidence,
      rates: built.rateConfidence,
      category: category.confidence,
      refund: refundMarked ? 0.92 : 0.34,
      card: card.confidence,
    },
    warnings: [...warnings, ...built.warnings],
  }
}
