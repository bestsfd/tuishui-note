import { defaultSettings, defaultTrip, normalizePurchase } from '../lib/purchase'
import type { AppData, PassportProfile, Purchase, Settings, Trip } from '../lib/types'

const DB_NAME = 'tuishui-note'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readKey<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  const value = await requestToPromise(db.transaction('kv').objectStore('kv').get(key))
  db.close()
  return value as T | undefined
}

async function writeKey(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction('kv', 'readwrite').objectStore('kv').put(value, key))
  db.close()
}

export async function loadAll(): Promise<AppData> {
  const [trip, passport, purchases, settings] = await Promise.all([
    readKey<Trip>('trip'),
    readKey<PassportProfile | null>('passport'),
    readKey<Purchase[]>('purchases'),
    readKey<Settings>('settings'),
  ])
  return {
    trip: trip ?? defaultTrip(),
    passport: passport ?? null,
    purchases: (purchases ?? []).map((purchase) => normalizePurchase(purchase)),
    settings: { ...defaultSettings(), ...settings },
  }
}

export async function saveTrip(trip: Trip): Promise<void> {
  await writeKey('trip', trip)
}

export async function savePassport(passport: PassportProfile | null): Promise<void> {
  await writeKey('passport', passport)
}

export async function savePurchases(purchases: Purchase[]): Promise<void> {
  await writeKey('purchases', purchases)
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeKey('settings', settings)
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction('photos', 'readwrite').objectStore('photos').put(blob, id))
  db.close()
}

export async function readPhoto(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  const value = await requestToPromise(db.transaction('photos').objectStore('photos').get(id))
  db.close()
  return value as Blob | undefined
}

export async function readAllPhotos(): Promise<Map<string, Blob>> {
  const db = await openDb()
  const rows = await requestToPromise(db.transaction('photos').objectStore('photos').getAll())
  const keys = await requestToPromise(db.transaction('photos').objectStore('photos').getAllKeys())
  db.close()
  const photos = new Map<string, Blob>()
  keys.forEach((key, index) => {
    const blob = rows[index]
    if (blob instanceof Blob) photos.set(String(key), blob)
  })
  return photos
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb()
  await requestToPromise(db.transaction('photos', 'readwrite').objectStore('photos').delete(id))
  db.close()
}

export async function clearAll(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['kv', 'photos'], 'readwrite')
  tx.objectStore('kv').clear()
  tx.objectStore('photos').clear()
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
