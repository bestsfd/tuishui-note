import type { Category, RefundStatus } from './types'

export const AIRPORTS = [
  '成田機場',
  '羽田機場',
  '關西機場',
  '中部機場',
  '福岡機場',
  '新千歲機場',
  '那霸機場',
  '其他機場或港口',
] as const

export const VJW_AIRPORTS = new Set<string>([
  '成田機場',
  '羽田機場',
  '關西機場',
  '中部機場',
  '福岡機場',
  '新千歲機場',
  '那霸機場',
])

export const STATUS_LABEL: Record<RefundStatus, string> = {
  unfiled: '未申請',
  registered: '已登記',
  customs: '海關已確認',
  refunded: '已退款',
}

export const CATEGORY_LABEL: Record<Category, string> = {
  general: '一般物品',
  consumable: '消耗品',
  mixed: '一般物品與消耗品',
  unknown: '尚未判斷',
}

export const STATUS_ORDER: RefundStatus[] = [
  'unfiled',
  'registered',
  'customs',
  'refunded',
]
