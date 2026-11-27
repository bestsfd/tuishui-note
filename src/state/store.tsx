import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { clearAll, loadAll, readAllPhotos, savePassport, savePhoto, savePurchases, saveSettings, saveTrip } from '../db/storage'
import { todayIso } from '../lib/dates'
import { FALLBACK_JPY_TO_TWD, FALLBACK_RATE_DATE } from '../lib/money'
import { createDemo, defaultSettings, defaultTrip } from '../lib/purchase'
import { evaluatePurchases, type RefundSummary } from '../lib/tax'
import type { AppData, PassportProfile, Purchase, Settings, Trip } from '../lib/types'
import { fetchJpyToTwd } from '../services/rates'

export interface ReceiptDraft {
  purchase: Purchase
  photoBlob: Blob | null
  photoUrl: string | null
}

export interface PassportDraft {
  profile: PassportProfile
  reliable: boolean
  warning: string
}

interface StoreValue {
  ready: boolean
  loadError: string
  trip: Trip
  passport: PassportProfile | null
  purchases: Purchase[]
  settings: Settings
  summary: RefundSummary
  today: string
  photoUrls: Record<string, string>
  receiptDraft: ReceiptDraft | null
  passportDraft: PassportDraft | null
  replacingId: string | null
  online: boolean
  updateTrip: (trip: Trip) => Promise<void>
  updatePassport: (passport: PassportProfile | null) => Promise<void>
  updateSettings: (settings: Settings) => Promise<void>
  refreshRate: () => Promise<Settings>
  setReceiptDraft: (draft: ReceiptDraft | null) => void
  setPassportDraft: (draft: PassportDraft | null) => void
  setReplacingId: (id: string | null) => void
  savePurchase: (purchase: Purchase, photoBlob?: Blob | null) => Promise<void>
  deletePurchase: (id: string) => Promise<void>
  loadDemo: () => Promise<void>
  wipe: () => Promise<void>
  replaceAll: (data: AppData, photos: { id: string; blob: Blob }[]) => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

function urlsFromPhotos(photos: Map<string, Blob>, previous: Record<string, string> = {}): Record<string, string> {
  Object.values(previous).forEach((url) => URL.revokeObjectURL(url))
  const next: Record<string, string> = {}
  photos.forEach((blob, id) => {
    next[id] = URL.createObjectURL(blob)
  })
  return next
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [trip, setTrip] = useState<Trip>(defaultTrip())
  const [passport, setPassport] = useState<PassportProfile | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [settings, setSettings] = useState<Settings>(defaultSettings())
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [receiptDraft, setReceiptDraftState] = useState<ReceiptDraft | null>(null)
  const [passportDraft, setPassportDraft] = useState<PassportDraft | null>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  const today = todayIso()

  useEffect(() => {
    let cancelled = false
    loadAll()
      .then(async (data) => {
        const photos = await readAllPhotos()
        if (cancelled) return
        setTrip(data.trip)
        setPassport(data.passport)
        setPurchases(data.purchases)
        setSettings(data.settings)
        setPhotoUrls(urlsFromPhotos(photos))
        setReady(true)
        if (data.settings.rateSource !== 'manual') {
          const result = await fetchJpyToTwd()
          if (cancelled) return
          const next = {
            ...data.settings,
            jpyToTwd: result.rate,
            rateSource: result.source,
            rateUpdatedAt: result.updatedAt,
          }
          setSettings(next)
          await saveSettings(next)
        }
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('這支手機上的紀錄讀不出來')
        setSettings({
          ...defaultSettings(),
          jpyToTwd: FALLBACK_JPY_TO_TWD,
          rateSource: 'fallback',
          rateUpdatedAt: FALLBACK_RATE_DATE,
        })
        setReady(true)
      })
    const on = () => setOnline(navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      cancelled = true
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])

  const summary = useMemo(
    () => evaluatePurchases(purchases, { feePercent: settings.feePercent, today, jpyToTwd: settings.jpyToTwd }),
    [purchases, settings.feePercent, settings.jpyToTwd, today],
  )

  function setReceiptDraft(draft: ReceiptDraft | null) {
    setReceiptDraftState((current) => {
      if (current?.photoUrl && current.photoUrl !== draft?.photoUrl) URL.revokeObjectURL(current.photoUrl)
      return draft
    })
  }

  async function updateTrip(next: Trip) {
    setTrip(next)
    await saveTrip(next)
  }

  async function updatePassport(next: PassportProfile | null) {
    setPassport(next)
    await savePassport(next)
  }

  async function updateSettings(next: Settings) {
    setSettings(next)
    await saveSettings(next)
  }

  async function refreshRate() {
    const result = await fetchJpyToTwd()
    const next = { ...settings, jpyToTwd: result.rate, rateSource: result.source, rateUpdatedAt: result.updatedAt }
    await updateSettings(next)
    return next
  }

  async function savePurchase(purchase: Purchase, photoBlob?: Blob | null) {
    const nextPurchase = { ...purchase, updatedAt: new Date().toISOString() }
    if (photoBlob) {
      nextPurchase.photoId = purchase.id
      await savePhoto(purchase.id, photoBlob)
      setPhotoUrls((current) => {
        if (current[purchase.id]) URL.revokeObjectURL(current[purchase.id])
        return { ...current, [purchase.id]: URL.createObjectURL(photoBlob) }
      })
    }
    const next = purchases.some((item) => item.id === nextPurchase.id)
      ? purchases.map((item) => (item.id === nextPurchase.id ? nextPurchase : item))
      : [nextPurchase, ...purchases]
    setPurchases(next)
    await savePurchases(next)
    setReplacingId(null)
  }

  async function deletePurchase(id: string) {
    const next = purchases.filter((item) => item.id !== id)
    setPurchases(next)
    await savePurchases(next)
    setPhotoUrls((current) => {
      if (!current[id]) return current
      URL.revokeObjectURL(current[id])
      const copy = { ...current }
      delete copy[id]
      return copy
    })
  }

  async function applyData(data: AppData, photos: Map<string, Blob>) {
    setTrip(data.trip)
    setPassport(data.passport)
    setPurchases(data.purchases)
    setSettings(data.settings)
    setPhotoUrls((current) => urlsFromPhotos(photos, current))
    await Promise.all([
      saveTrip(data.trip),
      savePassport(data.passport),
      savePurchases(data.purchases),
      saveSettings(data.settings),
    ])
  }

  async function loadDemo() {
    await clearAll()
    await applyData(createDemo(), new Map())
  }

  async function wipe() {
    await clearAll()
    setTrip(defaultTrip())
    setPassport(null)
    setPurchases([])
    setSettings(defaultSettings())
    setPhotoUrls((current) => urlsFromPhotos(new Map(), current))
    setReceiptDraft(null)
    setPassportDraft(null)
  }

  async function replaceAll(data: AppData, photos: { id: string; blob: Blob }[]) {
    await clearAll()
    for (const photo of photos) await savePhoto(photo.id, photo.blob)
    await applyData(data, new Map(photos.map((photo) => [photo.id, photo.blob])))
  }

  const value: StoreValue = {
    ready,
    loadError,
    trip,
    passport,
    purchases,
    settings,
    summary,
    today,
    photoUrls,
    receiptDraft,
    passportDraft,
    replacingId,
    online,
    updateTrip,
    updatePassport,
    updateSettings,
    refreshRate,
    setReceiptDraft,
    setPassportDraft,
    setReplacingId,
    savePurchase,
    deletePurchase,
    loadDemo,
    wipe,
    replaceAll,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('store')
  return value
}
