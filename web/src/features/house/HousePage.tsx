import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

// The house profile is a singleton form. Text inputs bind string state;
// numeric fields convert on submit.
const textFields = [
  'nickname',
  'address_line1',
  'address_line2',
  'city',
  'postal_code',
  'heating_type',
  'cooling_type',
  'parking_type',
] as const

const numberFields = ['year_built', 'square_feet', 'bedrooms', 'bathrooms'] as const

type HouseForm = Record<string, string>

export function HousePage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['house'],
    queryFn: async () => {
      try {
        return await api.get<Record<string, unknown>>('/house')
      } catch {
        return null // 404 until first save
      }
    },
  })

  const [form, setForm] = useState<HouseForm>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    const next: HouseForm = {}
    for (const f of textFields) next[f] = String(data[f] ?? '')
    for (const f of numberFields) {
      const v = data[f]
      next[f] = v === null || v === undefined || v === 0 ? '' : String(v)
    }
    setForm(next)
  }, [data])

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.put('/house', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['house'] })
      setSaved(true)
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setSaved(false)
    const payload: Record<string, unknown> = { ...data }
    for (const f of textFields) payload[f] = form[f] ?? ''
    for (const f of numberFields) payload[f] = form[f]?.trim() ? Number(form[f]) : 0
    save.mutate(payload)
  }

  const field = (key: string, type: 'text' | 'number' = 'text') => (
    <label key={key} className="block">
      <span className="mb-1.5 block text-sm font-medium text-body">{t(`house.${key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())}`)}</span>
      <Input
        type={type}
        value={form[key] ?? ''}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </label>
  )

  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">{t('house.title')}</h1>
      <form onSubmit={submit} className="max-w-lg space-y-4">
        {field('nickname')}
        {field('address_line1')}
        {field('address_line2')}
        <div className="grid grid-cols-2 gap-3">
          {field('city')}
          {field('postal_code')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('year_built', 'number')}
          {field('square_feet', 'number')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('bedrooms', 'number')}
          {field('bathrooms', 'number')}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('heating_type')}
          {field('cooling_type')}
        </div>
        {field('parking_type')}
        {save.error ? <p className="text-sm text-destructive">{save.error.message}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {t('common.save')}
          </Button>
          {saved ? <span className="text-sm text-muted-foreground">{t('house.saved')}</span> : null}
        </div>
      </form>
    </section>
  )
}
