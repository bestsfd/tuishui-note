import { formatLongDate } from './dates'
import { VJW_AIRPORTS } from './labels'
import { formatYen, HIGH_VALUE_EXCLUSIVE } from './money'
import type { EvaluatedPurchase } from './tax'
import type { Trip } from './types'

export interface CheckItem {
  id: string
  title: string
  detail: string
  tone: 'info' | 'warn' | 'good'
}

export function buildChecklist(input: {
  trip: Trip
  evaluated: EvaluatedPurchase[]
  today: string
}): CheckItem[] {
  const items: CheckItem[] = []
  const { trip, evaluated } = input
  const active = evaluated.filter((item) => item.purchase.status !== 'refunded')

  const overdue = active.filter((item) => item.daysToDeadline != null && item.daysToDeadline < 0 && !item.beforeReform)
  if (overdue.length > 0) {
    items.push({
      id: 'overdue',
      title: '有收據已超過確認期限',
      detail: overdue
        .map((item) => `${item.purchase.storeName || '未命名商店'}的期限是${formatLongDate(item.deadline)}`)
        .join('。'),
      tone: 'warn',
    })
  }

  if (trip.departureDate) {
    const late = active.filter((item) => item.deadline && trip.departureDate > item.deadline && !item.beforeReform)
    if (late.length > 0) {
      items.push({
        id: 'departure-after-deadline',
        title: '預計出境日晚於部分收據的期限',
        detail: '購買日的次日起算 90 日內，要在出境當天完成海關確認。請改看出境日，或這幾筆可能無法退。',
        tone: 'warn',
      })
    }
  }

  const consumables = active.filter(
    (item) => item.purchase.category === 'consumable' || item.purchase.category === 'mixed',
  )
  if (consumables.length > 0) {
    items.push({
      id: 'consumables',
      title: '這些先不要拆、不要用掉',
      detail: `${consumables
        .map((item) => item.purchase.storeName || '未命名商店')
        .join('、')}有食品、飲料或化粧品等消耗品。特殊包裝已經取消，但在日本吃掉或用掉就不能接受海關確認。同一張收據只要少一件，整張都不退。`,
      tone: 'warn',
    })
  }

  const short = active.filter((item) => item.purchase.eligible && !item.beforeReform && !item.qualified)
  if (short.length > 0) {
    items.push({
      id: 'threshold',
      title: '這些還沒達到當日最低門檻',
      detail: short
        .map((item) => `${item.purchase.storeName || '未命名商店'} ${formatLongDate(item.purchase.date)}：再買未稅 ${formatYen(item.shortfall)}`)
        .join('。'),
      tone: 'warn',
    })
  }

  const expensive = active.filter((item) => item.exclusive >= HIGH_VALUE_EXCLUSIVE)
  if (expensive.length > 0) {
    items.push({
      id: 'high-value',
      title: '高價商品準備鑑定書或保證書',
      detail: '未稅單價達到 100 萬日圓時，海關可能會一併看鑑定書或保證書。這筆金額若是好幾件加總，請以單件價格判斷。',
      tone: 'info',
    })
  }

  const pending = active.filter((item) => item.purchase.status !== 'customs')
  if (pending.length > 0) {
    items.push({
      id: 'pending',
      title: `還有 ${pending.length} 筆沒有完成海關確認`,
      detail: pending
        .map((item) => {
          const name = item.purchase.storeName || '未命名商店'
          const when = item.deadline ? `，期限 ${formatLongDate(item.deadline)}` : ''
          return `${name}${when}`
        })
        .join('；'),
      tone: 'warn',
    })
  } else if (active.length > 0) {
    items.push({
      id: 'pending-clear',
      title: '收據都已標成海關確認或已退款',
      detail: '若你是自己先改狀態，出境時仍要以端末結果為準。',
      tone: 'good',
    })
  }

  items.push(
    {
      id: 'passport',
      title: '帶同一本護照',
      detail: '店家登錄的是購買時那本護照。出境確認要出示同一本。',
      tone: 'info',
    },
    {
      id: 'before-bag',
      title: '先辦確認，再託運行李',
      detail: '抽到檢查時要把商品拿給海關看。行李交給航空公司後通常取不回來，端末若顯示需要檢查就不能補辦。',
      tone: 'info',
    },
    {
      id: 'kiosk',
      title: '安檢前到免稅手續機台',
      detail: '在國際線出發廳、還沒進入安檢時，用護照在免稅手續機台完成確認。畫面放行就結束；若要求檢查，到旁邊櫃台出示該張收據的全部商品。',
      tone: 'info',
    },
    {
      id: 'whole-receipt',
      title: '同一張收據要整張都帶得出去',
      detail: '海關以一張收據為單位。裡面任何一件沒有帶在身上，或消耗品已經在日本用掉，整張的消費稅都不退。',
      tone: 'info',
    },
    {
      id: 'connection',
      title: '國內線轉機要在最後出境的機場辦',
      detail: '若先搭國內線再轉國際線，手續在離開日本的那個機場，不是第一個國內線機場。',
      tone: 'info',
    },
    {
      id: 'who-pays',
      title: '退稅不是海關當場發',
      detail: '海關只確認物品有帶出國。錢由店家或代行業者依購買時約定的方式退回，例如信用卡、匯款，或少數店家在機場給現金。政府不另收手續費，但代辦者可能扣除。',
      tone: 'info',
    },
  )

  if (trip.airport && VJW_AIRPORTS.has(trip.airport)) {
    items.push({
      id: 'vjw',
      title: `${trip.airport}也可改用線上手續`,
      detail: '成田、羽田、關西、中部、福岡、新千歲、那霸可改用 Visit Japan Web。要事先設定好，並在安檢前連上手續專用的無線網路。用不了就改走機台。',
      tone: 'info',
    })
  }

  if (!trip.departureDate) {
    items.push({
      id: 'need-date',
      title: '還沒填出境日',
      detail: '填了以後，這裡才會對照每一筆的 90 日期限。',
      tone: 'warn',
    })
  }

  return items
}
