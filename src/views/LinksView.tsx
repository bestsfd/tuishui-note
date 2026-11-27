import { BackButton, PageTitle } from '../components/Shell'

const FLOW = [
  {
    title: '出發前',
    detail:
      '到 Visit Japan Web 建立帳號，登記護照與上陸許可。數位廳寫明，免稅用的畫面是給外國籍、而且在留資格是短期滯在、外交或公用的人。在外日本人要改看店家要求的證明。',
  },
  {
    title: '結帳',
    detail:
      '出示護照。店家若接受，可改出示 Visit Japan Web 的免稅碼，必須是當時的畫面，不能用截圖。依店家說明登記退款方式，把業者給的查詢網址貼到那一筆收據。',
  },
  {
    title: '在日本',
    detail: '食品、飲料、化粧品先不要拆、不要用掉。同一張收據少一件，整張都不能退。',
  },
  {
    title: '出境',
    detail:
      '購買日的次日起 90 日內，先到免稅手續機台讀護照，再託運行李。成田、羽田、關西、中部、新千歲、福岡、那霸也可以改用 Visit Japan Web，但要連該機場的手續專用無線網路，人要在安檢之前。',
  },
  {
    title: '退款',
    detail:
      '海關確認完成，不等於錢已經進來。到這一筆存的業者網頁，或店家當時說的方式，自己看有沒有退到。這個程式的已退款要自己點，不會自動改。',
  },
]

const OFFICIAL = [
  {
    label: '日本國稅廳：退稅方式說明',
    href: 'https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002.htm',
  },
  {
    label: '日本國稅廳：線上海關確認',
    href: 'https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002/onlinetetsuzuki.htm',
  },
  {
    label: '日本稅關：旅客說明',
    href: 'https://www.customs.go.jp/kaigairyoko/taxrefund/jpn.htm',
  },
  {
    label: '觀光廳：旅客常見問題',
    href: 'https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00023.html',
  },
  {
    label: 'Visit Japan Web',
    href: 'https://services.digital.go.jp/visit-japan-web/',
  },
]

const OPERATORS = [
  {
    label: 'Global Tax Free–Planet 旅客問答',
    href: 'https://gtf-planet.co.jp/faq/customer/',
    note: '只看得到向這家登記的購買。',
  },
  {
    label: 'Global Blue 日本頁',
    href: 'https://www.globalblue.com/ja',
    note: '只看得到向這家登記的購買。',
  },
]

export function LinksView() {
  return (
    <div>
      <BackButton fallback="/more" />
      <PageTitle kicker="退稅連結" title="客人怎麼走完" />
      <p className="mb-4 text-sm leading-6 text-ink/70">
        下面是官方說明和已知業者頁。沒有一個政府網站可以用護照查完全日本的退稅入帳。這個程式的退稅狀態要自己改。
      </p>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">客人流程</h2>
        <ol className="space-y-3">
          {FLOW.map((step, index) => (
            <li key={step.title} className="rounded-3xl bg-card px-4 py-4">
              <p className="text-xs text-ink/50">第 {index + 1} 步</p>
              <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">官方說明</h2>
        <ul className="mt-3 space-y-2">
          {OFFICIAL.map((item) => (
            <li key={item.href}>
              <a
                className="flex min-h-14 items-center rounded-2xl bg-card px-4 text-base text-navy underline"
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">已知的退稅業者</h2>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          店家用哪一家，就只能查那一家。收據上的查詢網址請貼到該筆的「退稅查詢網址」，從那裡開新分頁。
        </p>
        <ul className="mt-3 space-y-2">
          {OPERATORS.map((item) => (
            <li key={item.href} className="rounded-2xl bg-card px-4 py-3">
              <a className="text-base text-navy underline" href={item.href} target="_blank" rel="noreferrer">
                {item.label}
              </a>
              <p className="mt-1 text-sm text-ink/60">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
