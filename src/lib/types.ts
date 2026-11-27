export type TaxRate = 8 | 10

export type Category = 'general' | 'consumable' | 'mixed' | 'unknown'

export type RefundStatus = 'unfiled' | 'registered' | 'customs' | 'refunded'

export interface MoneyLine {
  id: string
  rate: TaxRate
  inclusive: number
  exclusive: number
  tax: number
}

export interface FieldConfidence {
  storeName: number
  date: number
  amounts: number
  rates: number
  category: number
  refund: number
  card: number
}

export interface Purchase {
  id: string
  storeName: string
  date: string
  lines: MoneyLine[]
  category: Category
  paymentCard: string
  status: RefundStatus
  refundMarkedOnReceipt: boolean
  eligible: boolean
  feePercent: number | null
  photoId: string | null
  operatorUrl: string
  confidence: FieldConfidence
  warnings: string[]
  createdAt: string
  updatedAt: string
}

export interface Trip {
  name: string
  departureDate: string
  airport: string
}

export interface PassportProfile {
  surname: string
  givenNames: string
  displayName: string
  number: string
  nationality: string
  nationalityCode: string
  birthDate: string
  expiryDate: string
  sex: string
  masked: boolean
}

export type RateSource = 'api' | 'manual' | 'fallback' | 'unset'

export interface Settings {
  jpyToTwd: number | null
  rateSource: RateSource
  rateUpdatedAt: string | null
  feePercent: number
  visionEnabled: boolean
  visionBaseUrl: string
  visionModel: string
  visionApiKey: string
}

export interface AppData {
  trip: Trip
  passport: PassportProfile | null
  purchases: Purchase[]
  settings: Settings
}
