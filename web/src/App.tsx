import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Hammer, LayoutDashboard, Map, Menu, Moon, Refrigerator, Search, Sun, Wrench } from 'lucide-react'
import { Button } from './components/ui/button'
import { cn } from './lib/utils'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AppliancesPage } from './features/appliances/AppliancesPage'
import { GenericEntityPage } from './features/entities/framework'
import {
  incidentsConfig,
  maintenanceConfig,
  projectsConfig,
  quotesConfig,
  roomsConfig,
  serviceLogsConfig,
  vendorsConfig,
} from './features/entities/configs'
import { FloorplanPage } from './features/floorplan/FloorplanPage'
import { DocumentsPage } from './features/documents/DocumentsPage'
import { HousePage } from './features/house/HousePage'
import { SettingsPage } from './features/settings/SettingsPage'
import { MorePage } from './features/more/MorePage'
import { SearchOverlay } from './features/search/SearchOverlay'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return { dark, toggle: () => setDark((d) => !d) }
}

// Mobile bottom bar fits five; projects lives under 더보기 there. The
// desktop sidebar has room for everything.
const tabs = [
  { to: '/', icon: LayoutDashboard, key: 'nav.home' },
  { to: '/floorplan', icon: Map, key: 'nav.floorplan' },
  { to: '/maintenance', icon: Wrench, key: 'nav.maintenance' },
  { to: '/projects', icon: Hammer, key: 'nav.projects', desktopOnly: true },
  { to: '/appliances', icon: Refrigerator, key: 'nav.appliances' },
  { to: '/more', icon: Menu, key: 'nav.more' },
] as const

const mobileTabs = tabs.filter((t) => !('desktopOnly' in t && t.desktopOnly))

function Shell() {
  const { t } = useTranslation()
  const { dark, toggle } = useDarkMode()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold tracking-tight">{t('app.title')}</span>
          <span className="text-sm text-muted-foreground">{t('app.subtitle')}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label={t('common.search')} onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t('common.darkMode')} onClick={toggle}>
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop: left sidebar. Mobile: hidden (bottom tabs instead). */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 border-r px-2 py-4 sm:block">
          <nav className="space-y-1">
            {tabs.map(({ to, icon: Icon, key }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {t(key)}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Full-width app frame; content itself caps at a readable width
            (left-aligned next to the sidebar, Linear-style). */}
        <main className="min-w-0 max-w-6xl flex-1 px-4 py-5 pb-24 sm:px-8 sm:pb-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/floorplan" element={<FloorplanPage />} />
            <Route path="/more/rooms" element={<GenericEntityPage config={roomsConfig} />} />
            <Route path="/maintenance" element={<GenericEntityPage config={maintenanceConfig} />} />
            <Route path="/projects" element={<GenericEntityPage config={projectsConfig} />} />
            <Route path="/appliances" element={<AppliancesPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/more/quotes" element={<GenericEntityPage config={quotesConfig} />} />
            <Route path="/more/vendors" element={<GenericEntityPage config={vendorsConfig} />} />
            <Route path="/more/incidents" element={<GenericEntityPage config={incidentsConfig} />} />
            <Route path="/more/service-logs" element={<GenericEntityPage config={serviceLogsConfig} />} />
            <Route path="/more/documents" element={<DocumentsPage />} />
            <Route path="/more/house" element={<HousePage />} />
            <Route path="/more/settings" element={<SettingsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {mobileTabs.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {t(key)}
            </NavLink>
          ))}
        </div>
      </nav>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
