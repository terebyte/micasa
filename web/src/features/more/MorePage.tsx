import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  CreditCard,
  DoorOpen,
  FileText,
  Hammer,
  Home,
  Package,
  ReceiptText,
  Settings,
  Store,
  Wrench,
} from 'lucide-react'
import { Card } from '../../components/ui/card'

const items = [
  { to: '/projects', icon: Hammer, key: 'more.projects' },
  { to: '/more/assets', icon: Package, key: 'more.assets' },
  { to: '/more/consumables', icon: Boxes, key: 'more.consumables' },
  { to: '/more/expenses', icon: CreditCard, key: 'more.expenses' },
  { to: '/more/rooms', icon: DoorOpen, key: 'more.rooms' },
  { to: '/more/quotes', icon: ReceiptText, key: 'more.quotes' },
  { to: '/more/vendors', icon: Store, key: 'more.vendors' },
  { to: '/more/service-logs', icon: Wrench, key: 'more.serviceLogs' },
  { to: '/more/incidents', icon: AlertTriangle, key: 'more.incidents' },
  { to: '/more/documents', icon: FileText, key: 'more.documents' },
  { to: '/more/house', icon: Home, key: 'more.house' },
  { to: '/more/settings', icon: Settings, key: 'more.settings' },
]

export function MorePage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{t('more.title')}</h1>
      <Card className="divide-y p-0 sm:p-0">
        {items.map(({ to, icon: Icon, key }) => (
          <Link key={to} to={to} className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-3 text-sm font-medium">
              <Icon className="h-4.5 w-4.5 text-muted-foreground" />
              {t(key)}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </Card>
    </section>
  )
}
