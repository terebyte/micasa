import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

interface Settings {
  currency: string
  unit_system: string
  show_dashboard: boolean
  discord_webhook_url: string
  ha_url: string
  ha_token: string
}

export function SettingsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Settings>('/settings'),
  })

  const [currency, setCurrency] = useState('')
  const [units, setUnits] = useState('metric')
  const [webhook, setWebhook] = useState('')
  const [haURL, setHAURL] = useState('')
  const [haToken, setHAToken] = useState('')
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [haResult, setHAResult] = useState<'ok' | 'fail' | null>(null)

  useEffect(() => {
    if (!data) return
    setCurrency(data.currency)
    setUnits(data.unit_system)
    setWebhook(data.discord_webhook_url)
    setHAURL(data.ha_url)
    setHAToken(data.ha_token)
  }, [data])

  const save = useMutation({
    mutationFn: (payload: Partial<Settings>) => api.put<Settings>('/settings', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
    },
  })

  const test = useMutation({
    mutationFn: () => api.post<void>('/notify/test', {}),
    onSuccess: () => setTestResult('ok'),
    onError: () => setTestResult('fail'),
  })

  const haCheck = useMutation({
    mutationFn: () => api.get<{ status: string }>('/ha/status'),
    onSuccess: () => setHAResult('ok'),
    onError: () => setHAResult('fail'),
  })

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{t('settings.title')}</h1>
      <div className="max-w-lg space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-body">{t('settings.currency')}</span>
          <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="KRW" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-body">{t('settings.unitSystem')}</span>
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm sm:h-10"
          >
            <option value="metric">{t('settings.metric')}</option>
            <option value="imperial">{t('settings.imperial')}</option>
          </select>
        </label>

        <div className="rounded-lg border p-4">
          <h2 className="mb-1 font-medium">{t('settings.discordTitle')}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{t('settings.discordHint')}</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">{t('settings.discordWebhook')}</span>
            <Input
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </label>
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={test.isPending}
              onClick={() => {
                setTestResult(null)
                test.mutate()
              }}
            >
              {t('settings.sendTest')}
            </Button>
            {testResult === 'ok' ? (
              <span className="text-sm text-muted-foreground">{t('settings.testOk')}</span>
            ) : null}
            {testResult === 'fail' ? (
              <span className="text-sm text-destructive">
                {test.error?.message ?? t('common.error')}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-1 font-medium">{t('settings.haTitle')}</h2>
          <p className="mb-3 text-sm text-muted-foreground">{t('settings.haHint')}</p>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-body">{t('settings.haUrl')}</span>
              <Input value={haURL} onChange={(e) => setHAURL(e.target.value)} placeholder="http://192.168.0.10:8123" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-body">{t('settings.haToken')}</span>
              <Input type="password" value={haToken} onChange={(e) => setHAToken(e.target.value)} />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={haCheck.isPending}
              onClick={() => {
                setHAResult(null)
                haCheck.mutate()
              }}
            >
              {t('settings.checkConnection')}
            </Button>
            {haResult === 'ok' ? (
              <span className="text-sm text-muted-foreground">{t('settings.haOk')}</span>
            ) : null}
            {haResult === 'fail' ? (
              <span className="text-sm text-destructive">
                {haCheck.error?.message ?? t('common.error')}
              </span>
            ) : null}
          </div>
        </div>

        {save.error ? <p className="text-sm text-destructive">{save.error.message}</p> : null}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setSaved(false)
              save.mutate({
                currency,
                unit_system: units,
                discord_webhook_url: webhook,
                ha_url: haURL,
                ha_token: haToken,
              })
            }}
            disabled={save.isPending}
          >
            {t('common.save')}
          </Button>
          {saved ? <span className="text-sm text-muted-foreground">{t('settings.saved')}</span> : null}
        </div>
      </div>
    </section>
  )
}
