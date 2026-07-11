import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { Button } from './components/ui/button'
import { AppliancesPage } from './features/appliances/AppliancesPage'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return { dark, toggle: () => setDark((d) => !d) }
}

export default function App() {
  const { t } = useTranslation()
  const { dark, toggle } = useDarkMode()

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold tracking-tight">{t('app.title')}</span>
          <span className="text-sm text-muted-foreground">{t('app.subtitle')}</span>
        </div>
        <Button variant="ghost" size="icon" aria-label={t('common.darkMode')} onClick={toggle}>
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>
      <main className="flex-1 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
        <AppliancesPage />
      </main>
    </div>
  )
}
