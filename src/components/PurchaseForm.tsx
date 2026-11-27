import { useState, type ReactNode } from 'react'
import { formatLongDate } from '../lib/dates'
import { CATEGORY_LABEL, STATUS_LABEL, STATUS_ORDER } from '../lib/labels'
import { formatTwd, formatYen, fromExclusive, fromInclusive, toTwd } from '../lib/money'
import { canSavePurchase, emptyLine } from '../lib/purchase'
import { evaluatePurchases } from '../lib/tax'
import type { Category, Purchase, Settings, TaxRate } from '../lib/types'
import { needsReview, safeHttpUrl } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Switch } from './ui/switch'

const CATEGORIES: Category[] = ['general', 'consumable', 'mixed']

function Field({
  label,
  review,
  children,
}: {
  label: string
  review?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium">
        {label}
        {review ? <span className="rounded-full bg-[#fde7c7] px-2 py-0.5 text-xs text-warn">請核對</span> : null}
      </span>
      {children}
    </label>
  )
}

export function PurchaseForm({
  purchase,
  others,
  settings,
  today,
  photoUrl,
  saveLabel,
  onChange,
  onSave,
  onRetake,
  onDelete,
}: {
  purchase: Purchase
  others: Purchase[]
  settings: Settings
  today: string
  photoUrl: string | null
  saveLabel: string
  onChange: (purchase: Purchase) => void
  onSave: () => void
  onRetake?: () => void
  onDelete?: () => void
}) {
  const [mode, setMode] = useState<'inclusive' | 'exclusive'>('inclusive')
  const summary = evaluatePurchases(
    [...others.filter((item) => item.id !== purchase.id), purchase],
    { feePercent: settings.feePercent, today, jpyToTwd: settings.jpyToTwd },
  )
  const item = summary.items.find((entry) => entry.purchase.id === purchase.id)
  const ready = canSavePurchase(purchase)

  function patch(partial: Partial<Purchase>, reviewed?: keyof Purchase['confidence']) {
    const confidence = reviewed ? { ...purchase.confidence, [reviewed]: 1 } : purchase.confidence
    onChange({ ...purchase, ...partial, confidence })
  }

  function updateAmount(index: number, raw: string) {
    const amount = Math.max(0, Math.round(Number(raw.replace(/[^\d]/g, '')) || 0))
    const lines = purchase.lines.map((line, lineIndex) => {
      if (lineIndex !== index) return line
      const money = mode === 'inclusive' ? fromInclusive(amount, line.rate) : fromExclusive(amount, line.rate)
      return { ...line, rate: line.rate, ...money }
    })
    patch({ lines }, 'amounts')
  }

  function updateRate(index: number, rate: TaxRate) {
    const lines = purchase.lines.map((line, lineIndex) => {
      if (lineIndex !== index) return line
      const money = mode === 'inclusive' ? fromInclusive(line.inclusive, rate) : fromExclusive(line.exclusive, rate)
      return { ...line, ...money, rate }
    })
    patch({ lines }, 'rates')
  }

  return (
    <div className="space-y-4">
      {photoUrl ? (
        <img src={photoUrl} alt="收據照片" className="max-h-56 w-full rounded-3xl object-contain bg-card" />
      ) : (
        <div className="rounded-3xl border border-dashed border-line bg-card px-4 py-8 text-center text-sm text-ink/60">
          尚未附加收據照片
        </div>
      )}
      {purchase.warnings.length > 0 ? (
        <ul className="space-y-1 rounded-2xl bg-[#fde7c7] px-4 py-3 text-sm leading-6 text-warn">
          {purchase.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <Field label="店名" review={needsReview(purchase.confidence.storeName)}>
        <Input
          value={purchase.storeName}
          onChange={(event) => patch({ storeName: event.target.value }, 'storeName')}
          className={needsReview(purchase.confidence.storeName) ? 'border-warn ring-2 ring-[#f3c98a]' : ''}
        />
      </Field>
      <Field label="購買日期" review={needsReview(purchase.confidence.date) || !purchase.date}>
        <Input
          type="date"
          value={purchase.date}
          onChange={(event) => patch({ date: event.target.value }, 'date')}
          className={needsReview(purchase.confidence.date) || !purchase.date ? 'border-warn ring-2 ring-[#f3c98a]' : ''}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={mode === 'inclusive' ? 'navy' : 'outline'} onClick={() => setMode('inclusive')}>
          含稅金額
        </Button>
        <Button variant={mode === 'exclusive' ? 'navy' : 'outline'} onClick={() => setMode('exclusive')}>
          未稅金額
        </Button>
      </div>
      {purchase.lines.map((line, index) => (
        <div key={line.id} className="space-y-3 rounded-3xl border border-line bg-card p-3">
          <Field label={purchase.lines.length > 1 ? `第 ${index + 1} 筆稅率` : '稅率'} review={needsReview(purchase.confidence.rates)}>
            <div className="grid grid-cols-2 gap-2">
              {([10, 8] as TaxRate[]).map((rate) => (
                <Button key={rate} variant={line.rate === rate ? 'navy' : 'outline'} onClick={() => updateRate(index, rate)}>
                  {rate}%
                </Button>
              ))}
            </div>
          </Field>
          <Field label={mode === 'inclusive' ? '含稅金額' : '未稅金額'} review={needsReview(purchase.confidence.amounts)}>
            <Input
              inputMode="numeric"
              value={mode === 'inclusive' ? line.inclusive || '' : line.exclusive || ''}
              onChange={(event) => updateAmount(index, event.target.value)}
              className={needsReview(purchase.confidence.amounts) ? 'border-warn ring-2 ring-[#f3c98a]' : ''}
            />
          </Field>
          <p className="text-sm leading-6 text-ink/70">
            未稅 {formatYen(line.exclusive)}，消費稅 {formatYen(line.tax)}，含稅 {formatYen(line.inclusive)}
          </p>
          {purchase.lines.length > 1 ? (
            <Button
              variant="ghost"
              onClick={() => patch({ lines: purchase.lines.filter((candidate) => candidate.id !== line.id) }, 'amounts')}
            >
              移掉這一筆稅率
            </Button>
          ) : null}
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() => {
          const rate: TaxRate = purchase.lines.some((line) => line.rate === 8) ? 10 : 8
          patch({ lines: [...purchase.lines, emptyLine(rate)] }, 'rates')
        }}
      >
        加上另一個稅率
      </Button>
      <Field label="種類" review={needsReview(purchase.confidence.category)}>
        <div className="grid grid-cols-1 gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={purchase.category === category ? 'navy' : 'outline'}
              onClick={() => patch({ category }, 'category')}
            >
              {CATEGORY_LABEL[category]}
            </Button>
          ))}
        </div>
      </Field>
      <Field label="付款方式" review={false}>
        <Input
          value={purchase.paymentCard}
          placeholder="例如卡片末四碼，沒有可以留空"
          onChange={(event) => patch({ paymentCard: event.target.value }, 'card')}
        />
      </Field>
      <Field label="退稅狀態" review={false}>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_ORDER.map((status) => (
            <Button key={status} variant={purchase.status === status ? 'navy' : 'outline'} onClick={() => patch({ status })}>
              {STATUS_LABEL[status]}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-sm leading-6 text-ink/65">
          狀態要自己改。這個程式沒有連上店家、海關或退稅業者，不會自動變成已退款。
        </p>
      </Field>
      <Field label="退稅查詢網址" review={false}>
        <Input
          inputMode="url"
          autoComplete="off"
          placeholder="貼上店家或業者給的查詢頁"
          value={purchase.operatorUrl}
          onChange={(event) => patch({ operatorUrl: event.target.value })}
        />
        <p className="mt-2 text-sm leading-6 text-ink/65">只會在新分頁打開，不會代你登入，也不會回寫退稅狀態。</p>
        {safeHttpUrl(purchase.operatorUrl) ? (
          <a
            className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-navy px-4 text-base font-medium text-paper"
            href={safeHttpUrl(purchase.operatorUrl) ?? undefined}
            target="_blank"
            rel="noreferrer"
          >
            開啟查詢頁
          </a>
        ) : purchase.operatorUrl.trim() ? (
          <p className="mt-2 text-sm text-warn">請貼上以 https 開頭的網址</p>
        ) : null}
      </Field>
      <Switch
        label="收據上有免稅或退稅登錄"
        checked={purchase.refundMarkedOnReceipt}
        onCheckedChange={(checked) =>
          patch({
            refundMarkedOnReceipt: checked,
            status: checked && purchase.status === 'unfiled' ? 'registered' : purchase.status,
          })
        }
      />
      <Switch label="列入退稅試算" checked={purchase.eligible} onCheckedChange={(eligible) => patch({ eligible })} />
      <Field label="這筆手續費百分比，空白代表用設定" review={false}>
        <Input
          inputMode="decimal"
          value={purchase.feePercent ?? ''}
          placeholder={`目前設定 ${settings.feePercent}%`}
          onChange={(event) => {
            const raw = event.target.value.trim()
            patch({ feePercent: raw === '' ? null : Math.max(0, Number(raw) || 0) })
          }}
        />
      </Field>
      {item ? (
        <section
          className={`rounded-3xl px-4 py-4 ${item.qualified ? 'bg-[#e5f2ea] text-moss' : 'bg-[#fde7c7] text-warn'}`}
        >
          <p className="text-sm">{item.reason ?? '已達同一店、同一日未稅 5,000 日圓'}</p>
          <p className="mt-2 text-2xl font-semibold">預估可退 {formatYen(item.netRefund)}</p>
          {settings.jpyToTwd != null ? (
            <p className="mt-1 text-sm">約 {formatTwd(toTwd(item.netRefund, settings.jpyToTwd))}</p>
          ) : null}
          {item.deadline ? <p className="mt-2 text-sm">確認期限 {formatLongDate(item.deadline)}</p> : null}
          {item.fee > 0 ? <p className="mt-1 text-sm">已依費率扣除 {formatYen(item.fee)}</p> : <p className="mt-1 text-sm">尚未扣除代辦手續費</p>}
        </section>
      ) : null}
      <Button size="lg" className="w-full" disabled={!ready} onClick={onSave}>
        {saveLabel}
      </Button>
      {!ready ? <p className="text-center text-sm text-ink/60">請補上店名、日期和金額後再儲存</p> : null}
      {onRetake ? (
        <Button variant="outline" className="w-full" onClick={onRetake}>
          重新拍攝
        </Button>
      ) : null}
      {onDelete ? (
        <Button variant="ghost" className="w-full text-bad" onClick={onDelete}>
          刪掉這筆
        </Button>
      ) : null}
    </div>
  )
}
