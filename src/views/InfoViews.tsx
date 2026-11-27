import { useState } from 'react'
import { BackButton, PageTitle } from '../components/Shell'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { JP_MARKERS } from '../content/jp-terms'
import { RULE_SECTIONS, RULE_SOURCES, RULES_VERIFIED_ON } from '../content/rules'
import { buildChecklist } from '../lib/checklist'
import { formatLongDate } from '../lib/dates'
import { AIRPORTS } from '../lib/labels'
import { maskPassportNumber } from '../lib/mrz'
import { normalizePurchase } from '../lib/purchase'
import { FALLBACK_JPY_TO_TWD } from '../lib/money'
import { formatRate } from '../lib/utils'
import { go } from '../router'
import { useStore } from '../state/store'
import type { Settings } from '../lib/types'

export function ChecklistView() {
  const store = useStore()
  const items = buildChecklist({ trip: store.trip, evaluated: store.summary.items, today: store.today })
  return (
    <div>
      <PageTitle kicker="出境前檢查" title="帶什麼、先做什麼" />
      <p className="mb-4 text-sm leading-6 text-ink/70">
        清單依你掃過的收據產生。它只是提醒，海關端末的結果才算數。
      </p>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`rounded-3xl px-4 py-4 ${
              item.tone === 'warn' ? 'bg-[#fde7c7]' : item.tone === 'good' ? 'bg-[#e5f2ea]' : 'bg-card'
            }`}
          >
            <p className="text-xs text-ink/50">第 {index + 1} 項</p>
            <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6">{item.detail}</p>
          </li>
        ))}
      </ol>
      <Button className="mt-4 w-full" variant="outline" onClick={() => go('/links')}>
        官方說明與退稅業者連結
      </Button>
    </div>
  )
}

export function RulesView() {
  const [year, month, day] = RULES_VERIFIED_ON.split('-')
  return (
    <div>
      <BackButton fallback="/more" />
      <PageTitle kicker="規則說明" title="日本購物退稅怎麼算" />
      <p className="mb-4 text-sm text-ink/60">最後核對：{year}年{Number(month)}月{Number(day)}日</p>
      <div className="space-y-5">
        {RULE_SECTIONS.map((section) => (
          <section key={section.title} className="rounded-3xl bg-card px-4 py-4">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-7">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
        <section className="rounded-3xl bg-card px-4 py-4">
          <h2 className="text-lg font-semibold">收據上可能看到的日文</h2>
          <p className="mt-2 text-sm leading-6">下面是店家收據上的寫法，用來對照，不是本程式的按鈕。</p>
          <ul className="mt-3 space-y-2">
            {JP_MARKERS.map((marker) => (
              <li key={marker} className="rounded-2xl bg-paper px-3 py-2 text-base">
                {marker}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl bg-card px-4 py-4">
          <h2 className="text-lg font-semibold">核對過的來源</h2>
          <ul className="mt-2 space-y-2 text-sm leading-6">
            {RULE_SOURCES.map((source) => (
              <li key={source.href}>
                <a className="text-navy underline" href={source.href} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export function MoreView() {
  const store = useStore()
  const links = [
    ['/trip', '行程', store.trip.name || '還沒取名'],
    ['/passport', '護照', store.passport ? maskPassportNumber(store.passport.number, true) : '尚未拍攝'],
    ['/rules', '規則說明', `核對於 ${formatLongDate(RULES_VERIFIED_ON)}`],
    ['/links', '退稅連結', '官方說明、業者頁、客人流程'],
    ['/settings', '設定', '匯率、手續費、辨識'],
    ['/backup', '備份', '匯出或還原'],
  ] as const
  return (
    <div>
      <PageTitle title="更多" />
      <ul className="space-y-2">
        {links.map(([path, title, detail]) => (
          <li key={path}>
            <button type="button" className="flex min-h-16 w-full items-center justify-between rounded-3xl bg-card px-4 text-left" onClick={() => go(path)}>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="text-sm text-ink/55">{detail}</span>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TripView() {
  const store = useStore()
  const [trip, setTrip] = useState(store.trip)
  return (
    <div className="space-y-4">
      <BackButton fallback="/more" />
      <PageTitle title="行程" />
      <label className="block text-sm font-medium">
        行程名稱
        <Input className="mt-1.5" value={trip.name} onChange={(event) => setTrip({ ...trip, name: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        出境日期
        <Input className="mt-1.5" type="date" value={trip.departureDate} onChange={(event) => setTrip({ ...trip, departureDate: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        出境機場
        <select
          className="mt-1.5 h-12 w-full rounded-2xl border border-line bg-card px-3"
          value={trip.airport}
          onChange={(event) => setTrip({ ...trip, airport: event.target.value })}
        >
          {AIRPORTS.map((airport) => (
            <option key={airport} value={airport}>
              {airport}
            </option>
          ))}
        </select>
      </label>
      <Button size="lg" className="w-full" onClick={() => void store.updateTrip(trip).then(() => go('/'))}>
        儲存行程
      </Button>
    </div>
  )
}

export function SettingsView() {
  const store = useStore()
  const [settings, setSettings] = useState<Settings>(store.settings)
  const [note, setNote] = useState('')
  return (
    <div className="space-y-4">
      <BackButton fallback="/more" />
      <PageTitle title="設定" />
      <label className="block text-sm font-medium">
        一日圓兌換新臺幣
        <Input
          className="mt-1.5"
          inputMode="decimal"
          value={settings.jpyToTwd ?? ''}
          onChange={(event) =>
            setSettings({
              ...settings,
              jpyToTwd: event.target.value === '' ? null : Number(event.target.value),
              rateSource: 'manual',
            })
          }
        />
      </label>
      <p className="text-sm leading-6 text-ink/65">
        {settings.jpyToTwd != null ? formatRate(settings.jpyToTwd) : '尚未設定'}。
        {settings.rateSource === 'fallback'
          ? ` 這是 ${settings.rateUpdatedAt} 的離線參考值，不是銀行牌告。`
          : settings.rateSource === 'manual'
            ? ' 這是你自己填的。'
            : settings.rateUpdatedAt
              ? ` 取自公開匯率，日期 ${settings.rateUpdatedAt}。`
              : ''}
      </p>
      <Button
        variant="outline"
        onClick={() => {
          void store.refreshRate().then((next) => {
            setSettings(next)
            setNote('已更新匯率')
          })
        }}
      >
        更新匯率
      </Button>
      {note ? <p className="text-sm text-moss">{note}</p> : null}
      <label className="block text-sm font-medium">
        代辦手續費（占消費稅的百分比）
        <Input
          className="mt-1.5"
          inputMode="decimal"
          value={settings.feePercent}
          onChange={(event) => setSettings({ ...settings, feePercent: Math.max(0, Number(event.target.value) || 0) })}
        />
      </label>
      <p className="text-sm leading-6 text-ink/65">
        政府不另收手續費。若店家或代行業者會從退稅金額扣除，把百分比填在這裡。各店不同，請以店家說明為準。預設是 0。離線參考匯率約 {FALLBACK_JPY_TO_TWD}。
      </p>
      <Switch
        label="使用我自己的辨識服務"
        checked={settings.visionEnabled}
        onCheckedChange={(visionEnabled) => setSettings({ ...settings, visionEnabled })}
      />
      <p className="text-sm leading-6 text-ink/65">
        預設完全在手機上辨識，收據和護照都不會上傳。打開後，只有收據照片會送到你填的網址。護照仍然只在手機上讀取。金鑰只存在這支手機。
      </p>
      <label className="block text-sm font-medium">
        服務網址
        <Input className="mt-1.5" value={settings.visionBaseUrl} onChange={(event) => setSettings({ ...settings, visionBaseUrl: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        模型代號
        <Input className="mt-1.5" value={settings.visionModel} onChange={(event) => setSettings({ ...settings, visionModel: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        金鑰
        <Input
          className="mt-1.5"
          type="password"
          autoComplete="off"
          value={settings.visionApiKey}
          onChange={(event) => setSettings({ ...settings, visionApiKey: event.target.value })}
        />
      </label>
      <Button size="lg" className="w-full" onClick={() => void store.updateSettings(settings).then(() => go('/more'))}>
        儲存設定
      </Button>
    </div>
  )
}

export function BackupView() {
  const store = useStore()
  const [includeKey, setIncludeKey] = useState(false)
  const [message, setMessage] = useState('')
  const [askWipe, setAskWipe] = useState(false)
  const [askDemo, setAskDemo] = useState(false)

  async function exportBackup() {
    const photos = await Promise.all(
      store.purchases
        .filter((purchase) => purchase.photoId && store.photoUrls[purchase.photoId])
        .map(async (purchase) => {
          const response = await fetch(store.photoUrls[purchase.photoId as string])
          const blob = await response.blob()
          const dataUrl = await blobToDataUrl(blob)
          return { id: purchase.photoId, dataUrl }
        }),
    )
    const settings = includeKey ? store.settings : { ...store.settings, visionApiKey: '' }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      trip: store.trip,
      passport: store.passport,
      purchases: store.purchases,
      settings,
      photos,
    }
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tuishui-backup.json'
    link.click()
    URL.revokeObjectURL(url)
    setMessage('已匯出備份檔')
  }

  async function importBackup(file: File | undefined) {
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as {
        version?: number
        trip?: typeof store.trip
        passport?: typeof store.passport
        purchases?: typeof store.purchases
        settings?: Partial<typeof store.settings>
        photos?: { id: string; dataUrl: string }[]
      }
      if (data.version !== 1 || !Array.isArray(data.purchases) || !data.trip) {
        setMessage('這個檔案讀不了，請確認是本程式匯出的備份')
        return
      }
      const photos = (data.photos ?? []).map((photo) => ({ id: photo.id, blob: dataUrlToBlob(photo.dataUrl) }))
      await store.replaceAll(
        {
          trip: data.trip,
          passport: data.passport ?? null,
          purchases: data.purchases.map((purchase) => normalizePurchase(purchase)),
          settings: { ...store.settings, ...data.settings, visionApiKey: data.settings?.visionApiKey ?? '' },
        },
        photos,
      )
      setMessage('已還原備份')
    } catch {
      setMessage('這個檔案讀不了，請確認是本程式匯出的備份')
    }
  }

  return (
    <div className="space-y-4">
      <BackButton fallback="/more" />
      <PageTitle title="備份與還原" />
      <p className="text-sm leading-6 text-ink/70">資料只在這支手機。刪掉主畫面圖示或清除網站資料前，請先匯出。</p>
      <Switch label="匯出時包含辨識金鑰" checked={includeKey} onCheckedChange={setIncludeKey} />
      <Button size="lg" className="w-full" onClick={() => void exportBackup()}>
        匯出備份
      </Button>
      <label className="flex h-14 cursor-pointer items-center justify-center rounded-2xl border border-line bg-card text-base font-medium">
        匯入備份
        <input
          className="hidden"
          type="file"
          accept="application/json"
          onChange={(event) => void importBackup(event.target.files?.[0])}
        />
      </label>
      <Button variant="outline" className="w-full" onClick={() => setAskDemo(true)}>
        載入示範行程
      </Button>
      <Button variant="ghost" className="w-full text-bad" onClick={() => setAskWipe(true)}>
        清除全部資料
      </Button>
      {message ? <p className="text-sm">{message}</p> : null}
      <ConfirmDialog
        open={askWipe}
        title="清除全部資料？"
        body="行程、護照、收據和照片都會從這支手機刪除。"
        confirmLabel="清除"
        onOpenChange={setAskWipe}
        onConfirm={() => void store.wipe()}
      />
      <ConfirmDialog
        open={askDemo}
        title="載入示範行程？"
        body="目前的紀錄會被示範資料取代。"
        confirmLabel="載入"
        onOpenChange={setAskDemo}
        onConfirm={() => void store.loadDemo()}
      />
    </div>
  )
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(',')
  const mime = header?.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(body ?? '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: mime })
}
