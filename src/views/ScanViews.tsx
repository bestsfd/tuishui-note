import { useRef, useState } from 'react'
import { BackButton, PageTitle } from '../components/Shell'
import { Button } from '../components/ui/button'
import { maskPassportNumber, nationalityLabel, sexLabel } from '../lib/mrz'
import { emptyPassport, purchaseFromParsed, sampleReceiptText } from '../lib/purchase'
import { parseReceiptText } from '../lib/receipt'
import { go } from '../router'
import { useStore } from '../state/store'
import { recognizePassportImage, recognizeReceiptImage } from '../services/ocr'

export function ScanView() {
  const store = useStore()
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage('正在讀取收據')
    try {
      const parsed = await recognizeReceiptImage(file, store.settings, setMessage)
      const purchase = purchaseFromParsed(parsed)
      if (store.replacingId) {
        const previous = store.purchases.find((item) => item.id === store.replacingId)
        if (previous) {
          purchase.id = previous.id
          purchase.createdAt = previous.createdAt
          purchase.paymentCard = purchase.paymentCard || previous.paymentCard
        }
      }
      store.setReceiptDraft({
        purchase,
        photoBlob: file,
        photoUrl: URL.createObjectURL(file),
      })
      go('/confirm')
    } catch {
      const purchase = purchaseFromParsed(parseReceiptText(''))
      purchase.warnings = ['這張沒有讀成，請重拍或直接改下面的欄位']
      store.setReceiptDraft({ purchase, photoBlob: file, photoUrl: URL.createObjectURL(file) })
      go('/confirm')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageTitle kicker="主要流程" title="拍攝收據" />
      <p className="text-sm leading-6 text-ink/70">
        對準整張日文收據，四個角都入鏡，盡量不要反光。店名、日期、金額和稅率會在手機上辨識，再請你確認。第一次要先載入日文語料，之後沒有網路也能辨識。
      </p>
      <div className="mt-5 space-y-3">
        <Button size="lg" className="w-full" disabled={busy} onClick={() => cameraRef.current?.click()}>
          打開相機
        </Button>
        <Button size="lg" variant="outline" className="w-full" disabled={busy} onClick={() => libraryRef.current?.click()}>
          從相簿選擇
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            const purchase = purchaseFromParsed(parseReceiptText(sampleReceiptText()))
            purchase.confidence = { ...purchase.confidence, storeName: 0.46, amounts: 0.48 }
            store.setReceiptDraft({ purchase, photoBlob: null, photoUrl: null })
            go('/confirm')
          }}
        >
          先看確認畫面的例子
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            store.setReceiptDraft({ purchase: purchaseFromParsed(parseReceiptText('')), photoBlob: null, photoUrl: null })
            go('/confirm')
          }}
        >
          沒有照片，改手動填
        </Button>
      </div>
      {message ? <p className="mt-4 text-sm leading-6 text-navy">{message}</p> : null}
      <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => void onFile(event.target.files?.[0])} />
      <input ref={libraryRef} className="hidden" type="file" accept="image/*" onChange={(event) => void onFile(event.target.files?.[0])} />
    </div>
  )
}

export function PassportScanView() {
  const store = useStore()
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setMessage('正在讀取護照')
    try {
      const fields = await recognizePassportImage(file, setMessage)
      if (!fields) {
        store.setPassportDraft({
          profile: emptyPassport(),
          reliable: false,
          warning: '沒有讀到護照底部兩行。請讓機讀區靠近鏡頭、避免反光後重拍，或直接填寫。',
        })
      } else {
        store.setPassportDraft({
          reliable: true,
          warning: '',
          profile: {
            surname: fields.surname,
            givenNames: fields.givenNames,
            displayName: '',
            number: fields.number,
            nationalityCode: fields.nationalityCode,
            nationality: nationalityLabel(fields.nationalityCode),
            birthDate: fields.birthDate,
            expiryDate: fields.expiryDate,
            sex: sexLabel(fields.sex),
            masked: true,
          },
        })
      }
      go('/confirm-passport')
    } catch {
      store.setPassportDraft({
        profile: emptyPassport(),
        reliable: false,
        warning: '護照照片沒有讀成。可以重拍，或改手動填。照片不會被保存。',
      })
      go('/confirm-passport')
    } finally {
      setBusy(false)
    }
  }

  const passport = store.passport
  return (
    <div>
      <BackButton fallback="/more" />
      <PageTitle kicker="只留在這支手機" title="拍攝護照" />
      <p className="text-sm leading-6 text-ink/70">
        請拍到護照個人資料頁底部的兩行機讀區。讀完就丟棄照片，只留下你確認的欄位。號碼預設遮住，也不會送到辨識服務。
      </p>
      {passport ? (
        <p className="mt-4 rounded-2xl bg-card px-4 py-3 text-sm">
          已存姓名 {passport.displayName || `${passport.surname} ${passport.givenNames}`}，號碼 {maskPassportNumber(passport.number, passport.masked)}
        </p>
      ) : null}
      <div className="mt-5 space-y-3">
        <Button size="lg" className="w-full" disabled={busy} onClick={() => cameraRef.current?.click()}>
          打開相機
        </Button>
        <Button size="lg" variant="outline" className="w-full" disabled={busy} onClick={() => libraryRef.current?.click()}>
          從相簿選擇
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            store.setPassportDraft({ profile: emptyPassport(), reliable: false, warning: '請手動填寫。護照照片不會被保存。' })
            go('/confirm-passport')
          }}
        >
          改手動填
        </Button>
      </div>
      {message ? <p className="mt-4 text-sm text-navy">{message}</p> : null}
      <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => void onFile(event.target.files?.[0])} />
      <input ref={libraryRef} className="hidden" type="file" accept="image/*" onChange={(event) => void onFile(event.target.files?.[0])} />
    </div>
  )
}
