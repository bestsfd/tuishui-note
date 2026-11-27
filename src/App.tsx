import { Shell } from './components/Shell'
import { useRoute } from './router'
import { useStore } from './state/store'
import { ConfirmPassportView, ConfirmReceiptView } from './views/ConfirmViews'
import { HomeView } from './views/HomeView'
import { BackupView, ChecklistView, MoreView, RulesView, SettingsView, TripView } from './views/InfoViews'
import { LinksView } from './views/LinksView'
import { DetailView, ListView } from './views/ListViews'
import { PassportScanView, ScanView } from './views/ScanViews'

function Screen() {
  const route = useRoute()
  if (route.name === 'scan') return <ScanView />
  if (route.name === 'passport') return <PassportScanView />
  if (route.name === 'confirm') return <ConfirmReceiptView />
  if (route.name === 'confirm-passport') return <ConfirmPassportView />
  if (route.name === 'list') return <ListView />
  if (route.name === 'detail') return <DetailView id={route.id ?? ''} />
  if (route.name === 'checklist') return <ChecklistView />
  if (route.name === 'rules') return <RulesView />
  if (route.name === 'links') return <LinksView />
  if (route.name === 'more') return <MoreView />
  if (route.name === 'trip') return <TripView />
  if (route.name === 'settings') return <SettingsView />
  if (route.name === 'backup') return <BackupView />
  return <HomeView />
}

export function App() {
  const store = useStore()
  return (
    <Shell>
      {store.loadError ? <p className="mb-3 rounded-2xl bg-[#fde7c7] px-4 py-3 text-sm">{store.loadError}</p> : null}
      {store.ready ? <Screen /> : <p className="pt-16 text-center text-sm">正在讀取這支手機上的紀錄</p>}
    </Shell>
  )
}
