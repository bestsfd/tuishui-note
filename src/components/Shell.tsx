import type { ReactNode } from 'react'
import { useRoute, go, type RouteName } from '../router'

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}
function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 7h2l1.2-2h3.6L16 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}
function IconList() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M8 7h11M8 12h11M8 17h11" />
      <circle cx="4.5" cy="7" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}
function IconPlane() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 12h7l8-6 1 2-5 4h5l2 2-2 1h-5l5 5-1 2-8-6H3z" />
    </svg>
  )
}
function IconMore() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  )
}

const TABS: { name: RouteName; label: string; path: string; icon: ReactNode }[] = [
  { name: 'home', label: '首頁', path: '/', icon: <IconHome /> },
  { name: 'list', label: '明細', path: '/list', icon: <IconList /> },
  { name: 'scan', label: '拍照', path: '/scan', icon: <IconCamera /> },
  { name: 'checklist', label: '出境', path: '/checklist', icon: <IconPlane /> },
  { name: 'more', label: '更多', path: '/more', icon: <IconMore /> },
]

export function Shell({ children }: { children: ReactNode }) {
  const route = useRoute()
  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg md:max-w-3xl">
      <main className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-36 md:px-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-5 md:max-w-3xl">
          {TABS.map((tab) => {
            const active = route.name === tab.name || (tab.name === 'list' && route.name === 'detail')
            const scan = tab.name === 'scan'
            return (
              <button
                key={tab.name}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => go(tab.path)}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs ${active ? 'text-persimmon' : 'text-ink/55'}`}
              >
                {scan ? (
                  <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-persimmon text-white shadow-lg">
                    {tab.icon}
                  </span>
                ) : (
                  tab.icon
                )}
                <span className={scan ? 'mt-0.5' : ''}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  return (
    <button
      type="button"
      className="mb-3 min-h-10 text-sm text-navy"
      onClick={() => (history.length > 1 ? history.back() : go(fallback))}
    >
      返回
    </button>
  )
}

export function PageTitle({ kicker, title }: { kicker?: string; title: string }) {
  return (
    <header className="mb-4">
      {kicker ? <p className="text-xs font-medium tracking-wide text-gold">{kicker}</p> : null}
      <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
    </header>
  )
}
