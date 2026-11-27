import { useState } from 'react'
import { BackButton, PageTitle } from '../components/Shell'
import { PurchaseForm } from '../components/PurchaseForm'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { maskPassportNumber } from '../lib/mrz'
import { go } from '../router'
import { useStore } from '../state/store'

export function ConfirmReceiptView() {
  const store = useStore()
  const draft = store.receiptDraft
  if (!draft) {
    return (
      <div>
        <BackButton />
        <PageTitle title="沒有待確認的收據" />
        <p className="text-sm leading-6 text-ink/70">這次辨識已經不在。請再拍一張。</p>
        <Button className="mt-4" onClick={() => go('/scan')}>
          回到拍照
        </Button>
      </div>
    )
  }
  return (
    <div>
      <BackButton fallback="/scan" />
      <PageTitle kicker="看一眼再儲存" title="確認這張收據" />
      <p className="mb-4 text-sm leading-6 text-ink/70">標著請核對的欄位把握比較低。改過的數字會依稅率重算未稅與消費稅。</p>
      <PurchaseForm
        purchase={draft.purchase}
        others={store.purchases}
        settings={store.settings}
        today={store.today}
        photoUrl={draft.photoUrl}
        saveLabel="儲存這筆購物"
        onChange={(purchase) => store.setReceiptDraft({ ...draft, purchase })}
        onRetake={() => go('/scan')}
        onSave={() => {
          void store.savePurchase(draft.purchase, draft.photoBlob).then(() => {
            store.setReceiptDraft(null)
            go('/list')
          })
        }}
      />
    </div>
  )
}

export function ConfirmPassportView() {
  const store = useStore()
  const draft = store.passportDraft
  const [reveal, setReveal] = useState(false)
  if (!draft) {
    return (
      <div>
        <BackButton fallback="/passport" />
        <PageTitle title="沒有待確認的護照" />
        <Button className="mt-4" onClick={() => go('/passport')}>
          回到拍攝護照
        </Button>
      </div>
    )
  }
  const profile = draft.profile
  const review = !draft.reliable
  function patch(partial: Partial<typeof profile>) {
    store.setPassportDraft({ ...draft!, profile: { ...profile, ...partial }, reliable: true, warning: draft!.warning })
  }
  return (
    <div className="space-y-4">
      <BackButton fallback="/passport" />
      <PageTitle kicker="照片不會保存" title="確認護照資料" />
      {draft.warning ? <p className="rounded-2xl bg-[#fde7c7] px-4 py-3 text-sm leading-6 text-warn">{draft.warning}</p> : null}
      <label className="block text-sm font-medium">
        中文姓名
        <Input className="mt-1.5" value={profile.displayName} onChange={(event) => patch({ displayName: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        <span className="mb-1.5 flex justify-between">姓（護照拼音）{review ? <em className="text-warn">請核對</em> : null}</span>
        <Input value={profile.surname} onChange={(event) => patch({ surname: event.target.value })} className={review ? 'border-warn ring-2 ring-[#f3c98a]' : ''} />
      </label>
      <label className="block text-sm font-medium">
        名（護照拼音）
        <Input className="mt-1.5" value={profile.givenNames} onChange={(event) => patch({ givenNames: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        護照號碼
        <Input
          className="mt-1.5"
          autoComplete="off"
          value={profile.masked && !reveal ? maskPassportNumber(profile.number, true) : profile.number}
          onFocus={() => setReveal(true)}
          onChange={(event) => patch({ number: event.target.value.replace(/\s/g, '').toUpperCase() })}
        />
      </label>
      <Switch label="遮住護照號碼" checked={profile.masked} onCheckedChange={(masked) => patch({ masked })} />
      <label className="block text-sm font-medium">
        國籍
        <Input className="mt-1.5" value={profile.nationality} onChange={(event) => patch({ nationality: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        出生日期
        <Input className="mt-1.5" type="date" value={profile.birthDate} onChange={(event) => patch({ birthDate: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        效期
        <Input className="mt-1.5" type="date" value={profile.expiryDate} onChange={(event) => patch({ expiryDate: event.target.value })} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {['女', '男', '未標示'].map((sex) => (
          <Button key={sex} variant={profile.sex === sex ? 'navy' : 'outline'} onClick={() => patch({ sex })}>
            {sex}
          </Button>
        ))}
      </div>
      <Button
        size="lg"
        className="w-full"
        disabled={!profile.number && !profile.displayName && !profile.surname}
        onClick={() => {
          void store.updatePassport(profile).then(() => {
            store.setPassportDraft(null)
            go('/trip')
          })
        }}
      >
        儲存護照資料
      </Button>
    </div>
  )
}
