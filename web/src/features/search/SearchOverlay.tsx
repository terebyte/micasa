import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

interface Result {
  entity_type: string
  entity_id: string
  entity_name: string
}

// Route per entity type for tap-through navigation.
const routes: Record<string, string> = {
  appliance: '/appliances',
  project: '/projects',
  maintenance: '/maintenance',
  incident: '/more/incidents',
  vendor: '/more/vendors',
  quote: '/more/quotes',
  document: '/more/documents',
  service_log: '/more/service-logs',
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const { data } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.get<Result[]>(`/search?q=${encodeURIComponent(query)}`),
    enabled: open && query.trim().length > 0,
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="mx-auto max-w-2xl px-4 pt-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.searchPlaceholder')}
            className="border-0 shadow-none focus-visible:ring-0"
          />
          <Button variant="ghost" size="icon" aria-label={t('common.cancel')} onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4 border-t">
          {query.trim() === '' ? null : !data || data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('common.noResults')}</p>
          ) : (
            <ul className="divide-y">
              {data.map((r) => (
                <li key={`${r.entity_type}-${r.entity_id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-1 py-3 text-left"
                    onClick={() => {
                      onClose()
                      navigate(routes[r.entity_type] ?? '/')
                    }}
                  >
                    <span className="truncate text-sm">{r.entity_name}</span>
                    <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                      {t(`enum.entityType.${r.entity_type}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
