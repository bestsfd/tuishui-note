import { useState } from 'react'
import { BackButton, PageTitle } from '../components/Shell'
import { PurchaseForm } from '../components/PurchaseForm'
import { Button } from '../components/ui/button'
import { ConfirmDialog } from '../components/ui/dialog'
import { formatLongDate } from '../lib/dates'
import { CATEGORY_LABEL, STATUS_LABEL } from '../lib/labels'
import { formatYen } from '../lib/money'
import { go } from '../router'
import { useStore } from '../state/store'
import type { Purchase } from '../lib/types'

export function ListView() {
  const store = useStore()
  const rows = [...store.summary.items].sort((a, b) => b.purchase.date.localeCompare(a.purchase.date))
  return (
    <div>
      <PageTitle kicker="這趟買了什麼" title="購物明細" />
      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-card px-4 py-8 text-center">
          <p className="font-medium">還沒有任何一筆</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">拍下收據後，會出現在這裡，也可以改狀態。</p>
          <Button className="mt-4" onClick={() => go('/scan')}>
            拍攝收據
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((item) => (
            <li key={item.purchase.id}>
              <button
                type="button"
                className="w-full rounded-3xl bg-card p-4 text-left"
                onClick={() => go(`/purchase/${item.purchase.id}`)}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-lg font-semibold">{item.purchase.storeName || '未命名商店'}</span>
                    <span className="mt-1 block text-sm text-ink/60">
                      {item.purchase.date ? formatLongDate(item.purchase.date) : '沒有日期'} · {CATEGORY_LABEL[item.purchase.category]}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold tabular-nums">{formatYen(item.netRefund)}</span>
                    <span className="text-xs text-ink/55">預估可退</span>
                  </span>
                </span>
                <span className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-paper px-2 py-1">{STATUS_LABEL[item.purchase.status]}</span>
                  <span className={`rounded-full px-2 py-1 ${item.qualified ? 'bg-[#e5f2ea] text-moss' : 'bg-[#fde7c7] text-warn'}`}>
                    {item.qualified ? '已達門檻' : '未達門檻'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DetailView({ id }: { id: string }) {
  const store = useStore()
  const existing = store.purchases.find((item) => item.id === id)
  const [draft, setDraft] = useState<Purchase | null>(existing ?? null)
  const [ask, setAsk] = useState(false)
  if (!existing || !draft) {
    return (
      <div>
        <BackButton fallback="/list" />
        <PageTitle title="找不到這筆" />
      </div>
    )
  }
  return (
    <div>
      <BackButton fallback="/list" />
      <PageTitle title={draft.storeName || '這筆購物'} />
      <PurchaseForm
        purchase={draft}
        others={store.purchases}
        settings={store.settings}
        today={store.today}
        photoUrl={draft.photoId ? store.photoUrls[draft.photoId] ?? null : null}
        saveLabel="儲存修改"
        onChange={setDraft}
        onRetake={() => {
          store.setReplacingId(draft.id)
          go('/scan')
        }}
        onDelete={() => setAsk(true)}
        onSave={() => {
          void store.savePurchase(draft).then(() => go('/list'))
        }}
      />
      <ConfirmDialog
        open={ask}
        title="刪掉這筆？"
        body="收據照片也會從這支手機移除。"
        confirmLabel="刪掉"
        onOpenChange={setAsk}
        onConfirm={() => {
          void store.deletePurchase(draft.id).then(() => go('/list'))
        }}
      />
    </div>
  )
}
