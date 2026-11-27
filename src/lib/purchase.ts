import { todayIso } from './dates'
import { fromExclusive, fromInclusive } from './money'
import type { ParsedReceipt } from './receipt'
import type { AppData, FieldConfidence, MoneyLine, PassportProfile, Purchase, Settings, TaxRate, Trip } from './types'

export const emptyConfidence = (): FieldConfidence => ({
  storeName: 0,
  date: 0,
  amounts: 0,
  rates: 0,
  category: 0,
  refund: 0,
  card: 0,
})

export const defaultTrip = (): Trip => ({
  name: '',
  departureDate: '',
  airport: '關西機場',
})

export const defaultSettings = (): Settings => ({
  jpyToTwd: null,
  rateSource: 'unset',
  rateUpdatedAt: null,
  feePercent: 0,
  visionEnabled: false,
  visionBaseUrl: 'https://api.openai.com/v1',
  visionModel: 'gpt-4o-mini',
  visionApiKey: '',
})

export function normalizePurchase(purchase: Purchase): Purchase {
  return {
    ...purchase,
    operatorUrl: typeof purchase.operatorUrl === 'string' ? purchase.operatorUrl : '',
  }
}

export function emptyLine(rate: TaxRate = 10): MoneyLine {
  return { id: crypto.randomUUID(), rate, inclusive: 0, exclusive: 0, tax: 0 }
}

export function blankPurchase(): Purchase {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    storeName: '',
    date: '',
    lines: [emptyLine(10)],
    category: 'unknown',
    paymentCard: '',
    status: 'unfiled',
    refundMarkedOnReceipt: false,
    eligible: true,
    feePercent: null,
    photoId: null,
    operatorUrl: '',
    confidence: emptyConfidence(),
    warnings: ['這筆是手動填的，請核對每一格'],
    createdAt: now,
    updatedAt: now,
  }
}

export function purchaseFromParsed(parsed: ParsedReceipt): Purchase {
  const now = new Date().toISOString()
  const blocked = parsed.warnings.some((warning) => warning.includes('地金'))
  return {
    id: crypto.randomUUID(),
    storeName: parsed.storeName ?? '',
    date: parsed.date ?? '',
    lines: parsed.lines.length > 0 ? parsed.lines.map((line) => ({ ...line, id: crypto.randomUUID() })) : [emptyLine(10)],
    category: parsed.category,
    paymentCard: parsed.paymentCard,
    status: parsed.refundMarked ? 'registered' : 'unfiled',
    refundMarkedOnReceipt: parsed.refundMarked,
    eligible: !blocked,
    feePercent: null,
    photoId: null,
    operatorUrl: '',
    confidence: parsed.confidence,
    warnings: parsed.warnings,
    createdAt: now,
    updatedAt: now,
  }
}

export function emptyPassport(): PassportProfile {
  return {
    surname: '',
    givenNames: '',
    displayName: '',
    number: '',
    nationality: '',
    nationalityCode: '',
    birthDate: '',
    expiryDate: '',
    sex: '',
    masked: true,
  }
}

export function createDemo(): AppData {
  const now = new Date().toISOString()
  const base = {
    paymentCard: '',
    refundMarkedOnReceipt: true,
    eligible: true,
    feePercent: null,
    photoId: null,
    operatorUrl: '',
    warnings: [],
    createdAt: now,
    updatedAt: now,
    confidence: {
      storeName: 0.9,
      date: 0.94,
      amounts: 0.9,
      rates: 0.9,
      category: 0.86,
      refund: 0.9,
      card: 0.8,
    },
  } satisfies Partial<Purchase>
  const daimaru = fromInclusive(11000, 10)
  const food = fromInclusive(3240, 8)
  const goods = fromInclusive(3300, 10)
  const muji = fromInclusive(4800, 10)
  const donki = fromInclusive(22000, 10)
  return {
    trip: { name: '京都大阪六日', departureDate: '2026-12-20', airport: '關西機場' },
    passport: {
      surname: 'WANG',
      givenNames: 'MEI LING',
      displayName: '王美玲',
      number: '300123456',
      nationality: '臺灣',
      nationalityCode: 'TWN',
      birthDate: '1990-05-15',
      expiryDate: '2028-11-30',
      sex: '女',
      masked: true,
    },
    settings: { ...defaultSettings(), jpyToTwd: 0.2068, rateSource: 'fallback', rateUpdatedAt: '2026-11-27' },
    purchases: [
      {
        ...base,
        id: 'demo-daimaru',
        storeName: '大丸京都店',
        date: '2026-11-20',
        lines: [{ id: 'demo-d1', rate: 10, ...daimaru }],
        category: 'general',
        paymentCard: '卡片末四碼 1234',
        status: 'registered',
      },
      {
        ...base,
        id: 'demo-seijo',
        storeName: '成城石井京都店',
        date: '2026-11-21',
        lines: [
          { id: 'demo-s1', rate: 8, ...food },
          { id: 'demo-s2', rate: 10, ...goods },
        ],
        category: 'mixed',
        paymentCard: '現金',
        status: 'unfiled',
        refundMarkedOnReceipt: false,
        confidence: { ...base.confidence, refund: 0.34 },
      },
      {
        ...base,
        id: 'demo-muji',
        storeName: '無印良品大阪店',
        date: '2026-11-22',
        lines: [{ id: 'demo-m1', rate: 10, ...muji }],
        category: 'general',
        status: 'unfiled',
        refundMarkedOnReceipt: false,
        confidence: { ...base.confidence, storeName: 0.52, amounts: 0.5, rates: 0.42 },
        warnings: ['再買一點就到達當日門檻'],
      },
      {
        ...base,
        id: 'demo-donki',
        storeName: '唐吉訶德道頓堀店',
        date: '2026-11-23',
        lines: [{ id: 'demo-k1', rate: 10, ...donki }],
        category: 'consumable',
        paymentCard: '卡片末四碼 8891',
        status: 'customs',
      },
    ],
  }
}

export function sampleReceiptText(): string {
  return `成城石丼 京都駅店
2026年11月21日
お弁当 ¥3,240
バッグ ¥3,300
合計 ¥6,540
`
}

export function canSavePurchase(purchase: Purchase): boolean {
  const hasMoney = purchase.lines.some((line) => line.inclusive > 0 || line.exclusive > 0)
  return purchase.storeName.trim().length > 0 && purchase.date.length > 0 && hasMoney
}

export function todayLabel(): string {
  return todayIso()
}

export { fromExclusive, fromInclusive }
