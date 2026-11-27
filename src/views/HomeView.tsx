import { useState } from 'react'
import { PageTitle } from '../components/Shell'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ui/dialog'
import { formatLongDate } from '../lib/dates'
import { STATUS_LABEL } from '../lib/labels'
import { formatTwd, formatYen } from '../lib/money'
import { formatRate } from '../lib/utils'
import { go } from '../router'
import { useStore } from '../state/store'

function isIosPhone(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || Boolean(nav.standalone)
}

export function HomeView() {
  const store = useStore()
  const [askDemo, setAskDemo] = useState(false)
  const { summary, trip, settings, purchases, today } = store
  const departureDays = trip.departureDate ? Math.round((Date.parse(`${trip.departureDate}T00:00:00`) - Date.parse(`${today}T00:00:00`)) / 86_400_000) : null
  const urgent = summary.items
    .filter((item) => item.daysToDeadline != null && item.purchase.status !== 'refunded')
    .sort((a, b) => (a.daysToDeadline ?? 0) - (b.daysToDeadline ?? 0))[0]
  const shortfalls = summary.storeDays.filter((day) => !day.qualified)

  return (
    <div>
      <PageTitle kicker="退稅手帖" title={trip.name || '這趟的日本購物'} />
      <p className="mb-4 text-sm leading-6 text-ink/70">
        {trip.departureDate
          ? `${formatLongDate(trip.departureDate)}從${trip.airport}出境`
          : '先記得出境日，才知道每一筆還有幾天要帶出國。'}
      </p>
      {!store.online ? (
        <p className="mb-4 rounded-2xl bg-card px-4 py-3 text-sm leading-6">目前沒有網路。已存的紀錄仍可看，匯率用上次的數字。</p>
      ) : null}
      {isIosPhone() && !isStandalone() ? (
        <p className="mb-4 rounded-2xl bg-navy px-4 py-3 text-sm leading-6 text-paper">
          用 Safari 的分享，選加入主畫面。從圖示打開才是全螢幕，也比較不容易被清掉。
        </p>
      ) : null}
      <div className="md:grid md:grid-cols-2 md:gap-4">
        <section className="rounded-[28px] bg-navy px-5 py-6 text-paper shadow-lg">
          <p className="text-sm text-paper/75">預估可退的消費稅</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">{formatYen(summary.estimatedRefund)}</p>
          <p className="mt-2 text-lg">
            {summary.estimatedRefundTwd == null ? '還沒有匯率' : `約 ${formatTwd(summary.estimatedRefundTwd)}`}
          </p>
          <p className="mt-3 text-sm leading-6 text-paper/75">
            {settings.feePercent > 0 ? `已依 ${settings.feePercent}% 扣除代辦手續費。` : '尚未扣除代辦手續費。'}
            {settings.jpyToTwd != null ? ` ${formatRate(settings.jpyToTwd)}。` : ''}
            這是整理用的估計，實際由店家或代行業者退。
          </p>
        </section>
        <div className="mt-4 grid grid-cols-2 gap-3 md:mt-0">
          <Stat label="這趟已付" value={formatYen(summary.spend)} />
          <Stat label="還沒確認" value={`${summary.pendingCount} 筆`} />
          <Stat label="出境還有" value={departureDays == null ? '未填' : departureDays >= 0 ? `${departureDays} 天` : '已過出境日'} />
          <Stat
            label="最近期限"
            value={urgent?.deadline ? `${formatLongDate(urgent.deadline).slice(5)}` : '尚無'}
          />
        </div>
      </div>
      {shortfalls.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {shortfalls.map((day) => (
            <li key={day.key} className="rounded-2xl bg-[#fde7c7] px-4 py-3 text-sm leading-6 text-warn">
              {day.storeName} {formatLongDate(day.date)} 未稅還差 {formatYen(day.shortfall)}
              {day.shortfall <= 2000 ? '，再買一點就到門檻。' : '。'}
            </li>
          ))}
        </ul>
      ) : null}
      <Button size="lg" className="mt-5 w-full" onClick={() => go('/scan')}>
        拍攝收據
      </Button>
      {purchases.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-line bg-card px-4 py-6 text-center">
          <p className="text-base font-medium">還沒有收據</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">拍一張日文收據，店名、日期、稅額和有沒有達門檻會先填好，再請你看一眼。</p>
          <Button variant="outline" className="mt-4" onClick={() => (purchases.length ? setAskDemo(true) : void store.loadDemo())}>
            載入示範行程
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {summary.items
            .filter((item) => item.purchase.status !== 'customs' && item.purchase.status !== 'refunded')
            .slice(0, 3)
            .map((item) => (
              <li key={item.purchase.id}>
                <button
                  type="button"
                  className="flex min-h-16 w-full items-center justify-between rounded-2xl bg-card px-4 text-left"
                  onClick={() => go(`/purchase/${item.purchase.id}`)}
                >
                  <span>
                    <span className="block font-medium">{item.purchase.storeName}</span>
                    <span className="text-sm text-ink/60">{STATUS_LABEL[item.purchase.status]}</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatYen(item.netRefund)}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
      <p className="mt-6 text-sm leading-6 text-ink/65">
        這本手帖只幫你整理與檢查。真正退稅仍由店家或代行業者處理，出境時還要由海關確認物品有帶出國。
        <button type="button" className="ml-1 text-navy underline" onClick={() => go('/rules')}>
          看規則說明
        </button>
      </p>
      <ConfirmDialog
        open={askDemo}
        title="載入示範行程？"
        body="目前的紀錄會被示範資料取代。需要的話先到更多裡匯出備份。"
        confirmLabel="載入"
        onConfirm={() => void store.loadDemo()}
        onOpenChange={setAskDemo}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-card px-3 py-4">
      <p className="text-xs text-ink/55">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
