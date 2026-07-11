import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { formatCents, formatDate, isOverdue } from '../../lib/format'
import { Card } from '../../components/ui/card'

interface Dashboard {
  maintenance: Array<{ id: string; name: string; due_date: string | null }>
  active_projects: Array<{ id: string; title: string; status: string }>
  open_incidents: Array<{ id: string; title: string; severity: string }>
  expiring_warranties: Array<{ id: string; name: string; warranty_expiry: string | null }>
  recent_service_logs: Array<{ id: string; serviced_at: string; notes: string; cost_cents: number | null }>
  ytd_service_spend_cents: number
  total_project_spend_cents: number
  counts: Record<string, number>
}

// Notion pastel tints give each stat tile its category warmth.
function StatTile({ to, tint, label, value }: { to: string; tint: string; label: string; value: string | number }) {
  return (
    <Link to={to} className={`block rounded-lg p-4 ${tint} transition-transform active:scale-[0.98]`}>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </Link>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Dashboard>('/dashboard'),
  })

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
  }
  if (isError || !data) {
    return <p className="py-12 text-center text-sm text-destructive">{t('common.error')}</p>
  }

  const overdue = data.maintenance.filter((m) => isOverdue(m.due_date))
  const upcoming = data.maintenance
    .filter((m) => m.due_date && !isOverdue(m.due_date))
    .slice(0, 5)

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{t('dashboard.title')}</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile to="/maintenance" tint="bg-tint-peach" label={t('dashboard.overdue')} value={overdue.length} />
        <StatTile to="/more/incidents" tint="bg-tint-rose" label={t('dashboard.openIncidents')} value={data.open_incidents.length} />
        <StatTile to="/projects" tint="bg-tint-sky" label={t('dashboard.activeProjects')} value={data.active_projects.length} />
        <StatTile to="/appliances" tint="bg-tint-mint" label={t('dashboard.appliances')} value={data.counts['appliances'] ?? 0} />
        <StatTile to="/more/service-logs" tint="bg-tint-yellow" label={t('dashboard.ytdSpend')} value={formatCents(data.ytd_service_spend_cents)} />
        <StatTile to="/projects" tint="bg-tint-lavender" label={t('dashboard.projectSpend')} value={formatCents(data.total_project_spend_cents)} />
      </div>

      <Section title={t('dashboard.upcoming')}>
        {overdue.length === 0 && upcoming.length === 0 ? (
          <Card className="text-sm text-muted-foreground">{t('dashboard.allClear')}</Card>
        ) : (
          <Card className="divide-y p-0 sm:p-0">
            {[...overdue, ...upcoming].slice(0, 6).map((m) => (
              <Link key={m.id} to="/maintenance" className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-sm">{m.name}</span>
                <span className={`ml-3 shrink-0 text-sm ${isOverdue(m.due_date) ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                  {formatDate(m.due_date)}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </Section>

      {data.open_incidents.length > 0 ? (
        <Section title={t('dashboard.openIncidents')}>
          <Card className="divide-y p-0 sm:p-0">
            {data.open_incidents.slice(0, 5).map((i) => (
              <Link key={i.id} to="/more/incidents" className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-sm">{i.title}</span>
                <span className="ml-3 shrink-0 text-sm text-muted-foreground">
                  {t(`enum.severity.${i.severity}`)}
                </span>
              </Link>
            ))}
          </Card>
        </Section>
      ) : null}

      {data.expiring_warranties.length > 0 ? (
        <Section title={t('dashboard.warranties')}>
          <Card className="divide-y p-0 sm:p-0">
            {data.expiring_warranties.map((a) => (
              <Link key={a.id} to="/appliances" className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-sm">{a.name}</span>
                <span className="ml-3 shrink-0 text-sm text-muted-foreground">{formatDate(a.warranty_expiry)}</span>
              </Link>
            ))}
          </Card>
        </Section>
      ) : null}

      {data.recent_service_logs.length > 0 ? (
        <Section title={t('dashboard.recentLogs')}>
          <Card className="divide-y p-0 sm:p-0">
            {data.recent_service_logs.map((s) => (
              <Link key={s.id} to="/more/service-logs" className="flex items-center justify-between px-4 py-3">
                <span className="truncate text-sm">{s.notes || formatDate(s.serviced_at)}</span>
                <span className="ml-3 shrink-0 text-sm text-muted-foreground">
                  {s.cost_cents != null ? formatCents(s.cost_cents) : formatDate(s.serviced_at)}
                </span>
              </Link>
            ))}
          </Card>
        </Section>
      ) : null}
    </div>
  )
}
