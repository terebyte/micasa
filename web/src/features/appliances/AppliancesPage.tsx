import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Dialog } from '../../components/ui/dialog'
import { ApplianceForm } from './ApplianceForm'
import {
  useAppliances,
  useCreateAppliance,
  useDeleteAppliance,
  useUpdateAppliance,
} from './hooks'
import { emptyInput, toInput, type Appliance } from './types'

type Editing = { mode: 'create' } | { mode: 'edit'; item: Appliance } | null

export function AppliancesPage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAppliances()
  const create = useCreateAppliance()
  const update = useUpdateAppliance()
  const remove = useDeleteAppliance()
  const [editing, setEditing] = useState<Editing>(null)

  const close = () => {
    create.reset()
    update.reset()
    setEditing(null)
  }

  const onDelete = (item: Appliance) => {
    if (window.confirm(t('common.confirmDelete'))) {
      remove.mutate(item.id)
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t('appliance.title')}</h1>
        <Button onClick={() => setEditing({ mode: 'create' })}>
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
        <div className="rounded-lg bg-tint-yellow px-4 py-12 text-center dark:bg-tint-yellow">
          <p className="text-sm font-medium">{t('common.empty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('appliance.emptyHint')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <li key={item.id}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-medium">{item.name}</h2>
                    {item.brand ? (
                      <p className="text-sm text-muted-foreground">{item.brand}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.edit')}
                      onClick={() => setEditing({ mode: 'edit', item })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.delete')}
                      onClick={() => onDelete(item)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {item.location ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {item.location}
                  </p>
                ) : null}
                {item.notes ? (
                  <p className="line-clamp-2 text-sm text-body">{item.notes}</p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={close}
        title={editing?.mode === 'edit' ? t('appliance.editTitle') : t('appliance.addTitle')}
      >
        {editing ? (
          <ApplianceForm
            initial={editing.mode === 'edit' ? toInput(editing.item) : emptyInput}
            pending={create.isPending || update.isPending}
            error={create.error?.message ?? update.error?.message ?? null}
            onCancel={close}
            onSubmit={(input) => {
              if (editing.mode === 'edit') {
                update.mutate({ id: editing.item.id, input }, { onSuccess: close })
              } else {
                create.mutate(input, { onSuccess: close })
              }
            }}
          />
        ) : null}
      </Dialog>
    </section>
  )
}
