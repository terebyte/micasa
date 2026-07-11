import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Input, Textarea } from '../../components/ui/input'
import type { ApplianceInput } from './types'

interface Props {
  initial: ApplianceInput
  pending: boolean
  error: string | null
  onSubmit: (input: ApplianceInput) => void
  onCancel: () => void
}

// Dates travel as RFC3339 in the API; the form edits the yyyy-mm-dd part.
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

function fromDateInput(value: string): string | null {
  return value ? `${value}T00:00:00Z` : null
}

export function ApplianceForm({ initial, pending, error, onSubmit, onCancel }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<ApplianceInput>(initial)
  const [nameError, setNameError] = useState(false)

  const set = (patch: Partial<ApplianceInput>) => setForm((f) => ({ ...f, ...patch }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setNameError(true)
      return
    }
    onSubmit({ ...form, name: form.name.trim() })
  }

  const field = (label: string, node: React.ReactNode, err?: string) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-body">{label}</span>
      {node}
      {err ? <span className="mt-1 block text-xs text-destructive">{err}</span> : null}
    </label>
  )

  return (
    <form onSubmit={submit} className="space-y-4">
      {field(
        t('appliance.name'),
        <Input
          value={form.name}
          placeholder={t('appliance.namePlaceholder')}
          onChange={(e) => {
            set({ name: e.target.value })
            setNameError(false)
          }}
          autoFocus
        />,
        nameError ? t('common.required') : undefined,
      )}
      <div className="grid grid-cols-2 gap-3">
        {field(
          t('appliance.brand'),
          <Input
            value={form.brand}
            placeholder={t('appliance.brandPlaceholder')}
            onChange={(e) => set({ brand: e.target.value })}
          />,
        )}
        {field(
          t('appliance.location'),
          <Input
            value={form.location}
            placeholder={t('appliance.locationPlaceholder')}
            onChange={(e) => set({ location: e.target.value })}
          />,
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field(
          t('appliance.modelNumber'),
          <Input
            value={form.model_number}
            onChange={(e) => set({ model_number: e.target.value })}
          />,
        )}
        {field(
          t('appliance.serialNumber'),
          <Input
            value={form.serial_number}
            onChange={(e) => set({ serial_number: e.target.value })}
          />,
        )}
      </div>
      {field(
        t('appliance.purchaseDate'),
        <Input
          type="date"
          value={toDateInput(form.purchase_date)}
          onChange={(e) => set({ purchase_date: fromDateInput(e.target.value) })}
        />,
      )}
      {field(
        t('appliance.notes'),
        <Textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} />,
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
