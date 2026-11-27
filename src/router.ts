import { useEffect, useState } from 'react'

export type RouteName =
  | 'home'
  | 'scan'
  | 'passport'
  | 'confirm'
  | 'confirm-passport'
  | 'list'
  | 'detail'
  | 'checklist'
  | 'rules'
  | 'links'
  | 'more'
  | 'trip'
  | 'settings'
  | 'backup'

export interface Route {
  name: RouteName
  id?: string
}

export function parseHash(hash: string): Route {
  const path = (hash.replace(/^#/, '') || '/').split('?')[0] ?? '/'
  if (path === '/' || path === '') return { name: 'home' }
  if (path === '/scan') return { name: 'scan' }
  if (path === '/passport') return { name: 'passport' }
  if (path === '/confirm') return { name: 'confirm' }
  if (path === '/confirm-passport') return { name: 'confirm-passport' }
  if (path === '/list') return { name: 'list' }
  if (path.startsWith('/purchase/')) return { name: 'detail', id: decodeURIComponent(path.slice('/purchase/'.length)) }
  if (path === '/checklist') return { name: 'checklist' }
  if (path === '/rules') return { name: 'rules' }
  if (path === '/links') return { name: 'links' }
  if (path === '/more') return { name: 'more' }
  if (path === '/trip') return { name: 'trip' }
  if (path === '/settings') return { name: 'settings' }
  if (path === '/backup') return { name: 'backup' }
  return { name: 'home' }
}

export function go(path: string) {
  const next = `#${path}`
  if (location.hash === next) return
  location.hash = path
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.name, route.id])
  return route
}
