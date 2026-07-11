import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { centsToWon, formatCents, formatDate, fromDateInput, toDateInput, wonToCents } from '../../lib/format'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Dialog } from '../../components/ui/dialog'
import { Input, Textarea } from '../../components/ui/input'

// Config-driven CRUD pages: one EntityConfig describes the API path, the
// form fields, and how to render a list card. Every entity screen is an
// instance of GenericEntityPage over its config, so new entities cost a
// config object rather than a page.

export type FieldType = 'text' | 'textarea' | 'date' | 'number' | 'money' | 'select'

export interface SelectOption {
  value: string
  label: string
}

export interface FieldDef {
  key: string
  labelKey: string
  type: FieldType
  required?: boolean
  // select sources: either a static list of i18n option keys...
  staticOptions?: SelectOption[]
  // ...or an endpoint returning entities, mapped by valueKey/labelKey fields.
  optionsPath?: string
  optionValueField?: string
  optionLabelField?: string
  clearable?: boolean
  placeholderKey?: string
}

type Row = Record<string, unknown>

export interface EntityConfig {
  apiPath: string
  i18nKey: string
  titleField: string
  subtitleField?: string
  fields: FieldDef[]
  cardMeta?: (item: Row, t: (k: string) => string) => ReactNode
}

export function useOptions(field: FieldDef) {
  return useQuery({
    queryKey: ['options', field.optionsPath],
    queryFn: () => api.get<Row[]>(field.optionsPath!),
    enabled: Boolean(field.optionsPath),
    select: (rows): SelectOption[] =>
      rows.map((r) => ({
        value: String(r[field.optionValueField ?? 'id'] ?? ''),
        label: String(r[field.optionLabelField ?? 'name'] ?? ''),
      })),
  })
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: string
  onChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const remote = useOptions(field)
  const options = field.staticOptions ?? remote.data ?? []
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10"
    >
      <option value="">{field.clearable === false ? t('common.select') : t('common.none')}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label.startsWith('enum.') ? t(o.label) : o.label}
        </option>
      ))}
    </select>
  )
}

function fieldToForm(item: Row, fields: FieldDef[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of fields) {
    const v = item[f.key]
    switch (f.type) {
      case 'date':
        out[f.key] = toDateInput(v as string | null)
        break
      case 'money':
        out[f.key] = String(centsToWon(v as number | null))
        break
      case 'number':
        out[f.key] = v === null || v === undefined || v === 0 ? '' : String(v)
        break
      default:
        out[f.key] = v === null || v === undefined ? '' : String(v)
    }
  }
  return out
}

function formToPayload(form: Record<string, string>, fields: FieldDef[]): Row {
  const out: Row = {}
  for (const f of fields) {
    const raw = form[f.key] ?? ''
    switch (f.type) {
      case 'date':
        out[f.key] = fromDateInput(raw)
        break
      case 'money':
        out[f.key] = wonToCents(raw)
        break
      case 'number':
        out[f.key] = raw.trim() === '' ? 0 : Number(raw)
        break
      case 'select':
        out[f.key] = raw === '' && f.clearable !== false ? null : raw
        break
      default:
        out[f.key] = raw
    }
  }
  return out
}

function GenericForm({
  config,
  initial,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  config: EntityConfig
  initial: Record<string, string>
  pending: boolean
  error: string | null
  onSubmit: (payload: Row) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initial)
  const [missing, setMissing] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    for (const f of config.fields) {
      if (f.required && (form[f.key] ?? '').trim() === '') {
        setMissing(f.key)
        return
      }
    }
    onSubmit(formToPayload(form, config.fields))
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {config.fields.map((f) => {
        const value = form[f.key] ?? ''
        const set = (v: string) => {
          setForm((prev) => ({ ...prev, [f.key]: v }))
          setMissing(null)
        }
        let control: ReactNode
        switch (f.type) {
          case 'textarea':
            control = <Textarea value={value} onChange={(e) => set(e.target.value)} />
            break
          case 'date':
            control = <Input type="date" value={value} onChange={(e) => set(e.target.value)} />
            break
          case 'number':
          case 'money':
            control = (
              <Input type="number" inputMode="numeric" value={value} onChange={(e) => set(e.target.value)} />
            )
            break
          case 'select':
            control = <SelectField field={f} value={value} onChange={set} />
            break
          default:
            control = (
              <Input
                value={value}
                placeholder={f.placeholderKey ? t(f.placeholderKey) : undefined}
                onChange={(e) => set(e.target.value)}
              />
            )
        }
        return (
          <label key={f.key} className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">
              {t(f.labelKey)}
              {f.required ? ' *' : ''}
            </span>
            {control}
            {missing === f.key ? (
              <span className="mt-1 block text-xs text-destructive">{t('common.required')}</span>
            ) : null}
          </label>
        )
      })}
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

export function GenericEntityPage({ config }: { config: EntityConfig }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const listKey = [config.apiPath]

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: listKey,
    queryFn: () => api.get<Row[]>(config.apiPath),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: listKey })

  const create = useMutation({
    mutationFn: (payload: Row) => api.post<Row>(config.apiPath, payload),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Row }) =>
      api.put<Row>(`${config.apiPath}/${id}`, payload),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`${config.apiPath}/${id}`),
    onSuccess: invalidate,
    onError: (err) => window.alert(err.message),
  })

  const [editing, setEditing] = useState<{ id?: string; item?: Row } | null>(null)
  const close = () => {
    create.reset()
    update.reset()
    setEditing(null)
  }

  const emptyForm = useMemo(() => {
    const base: Row = {}
    return fieldToForm(base, config.fields)
  }, [config])

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t(`${config.i18nKey}.title`)}</h1>
        <Button onClick={() => setEditing({})}>
          <Plus className="h-4 w-4" />
          {t('common.add')}
        </Button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : isError ? (
        <div className="py-12 text-center">
          <p className="mb-3 text-sm text-destructive">{t('common.error')}</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg bg-tint-yellow px-4 py-12 text-center">
          <p className="text-sm font-medium">{t('common.empty')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => {
            const id = String(item.id)
            const title = String(item[config.titleField] ?? '')
            const subtitle = config.subtitleField ? String(item[config.subtitleField] ?? '') : ''
            return (
              <li key={id}>
                <Card className="flex h-full flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-medium">{title || '-'}</h2>
                      {subtitle ? (
                        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common.edit')}
                        onClick={() => setEditing({ id, item })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('common.delete')}
                        onClick={() => {
                          if (window.confirm(t('common.confirmDelete'))) remove.mutate(id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {config.cardMeta ? config.cardMeta(item, t) : null}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={close}
        title={editing?.id ? t(`${config.i18nKey}.editTitle`) : t(`${config.i18nKey}.addTitle`)}
      >
        {editing ? (
          <GenericForm
            config={config}
            initial={editing.item ? fieldToForm(editing.item, config.fields) : emptyForm}
            pending={create.isPending || update.isPending}
            error={create.error?.message ?? update.error?.message ?? null}
            onCancel={close}
            onSubmit={(payload) => {
              if (editing.id) {
                update.mutate({ id: editing.id, payload }, { onSuccess: close })
              } else {
                create.mutate(payload, { onSuccess: close })
              }
            }}
          />
        ) : null}
      </Dialog>
    </section>
  )
}

export { formatCents, formatDate }
