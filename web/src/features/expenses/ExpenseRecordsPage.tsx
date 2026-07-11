import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { formatCents, wonToCents, centsToWon } from '../../lib/format'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Dialog } from '../../components/ui/dialog'
import { Input, Textarea } from '../../components/ui/input'

interface Expense {
  id: string
  name: string
}

interface ExpenseRecord {
  id: string
  expense_id: string
  period: string
  amount_cents: number
  notes: string
}

interface Doc {
  id: string
  title: string
  file_name: string
  entity_id: string
}

async function uploadBill(recordID: string, file: File): Promise<void> {
  const form = new FormData()
  form.set('file', file)
  form.set('title', file.name)
  form.set('entity_kind', 'expense_record')
  form.set('entity_id', recordID)
  const res = await fetch('/api/documents', { method: 'POST', body: form })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
}

export function ExpenseRecordsPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const expense = useQuery({
    queryKey: ['expense', id],
    queryFn: () => api.get<Expense>(`/expenses/${id}`),
    enabled: Boolean(id),
  })
  const records = useQuery({
    queryKey: ['expense-records', id],
    queryFn: () => api.get<ExpenseRecord[]>(`/expenses/${id}/records`),
    enabled: Boolean(id),
  })
  // One query fetches every bill document for this expense's records.
  const docs = useQuery({
    queryKey: ['expense-record-docs', id, records.data?.length],
    queryFn: async () => {
      const out: Doc[] = []
      for (const r of records.data ?? []) {
        const list = await api.get<Doc[]>(`/documents?entity_kind=expense_record&entity_id=${r.id}`)
        out.push(...list)
      }
      return out
    },
    enabled: Boolean(records.data),
  })
  const docsFor = (recordID: string) => (docs.data ?? []).filter((d) => d.entity_id === recordID)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['expense-records', id] })
    qc.invalidateQueries({ queryKey: ['expense-record-docs', id] })
  }

  const create = useMutation({
    mutationFn: (payload: Partial<ExpenseRecord>) =>
      api.post<ExpenseRecord>(`/expenses/${id}/records`, payload),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ rid, payload }: { rid: string; payload: Partial<ExpenseRecord> }) =>
      api.put<ExpenseRecord>(`/expense-records/${rid}`, payload),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (rid: string) => api.del(`/expense-records/${rid}`),
    onSuccess: invalidate,
  })
  const attach = useMutation({
    mutationFn: ({ rid, file }: { rid: string; file: File }) => uploadBill(rid, file),
    onSuccess: invalidate,
    onError: (err) => window.alert(err.message),
  })

  const [editing, setEditing] = useState<{ record?: ExpenseRecord } | null>(null)
  const [period, setPeriod] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const openDialog = (record?: ExpenseRecord) => {
    setPeriod(record?.period ?? new Date().toISOString().slice(0, 7))
    setAmount(record ? String(centsToWon(record.amount_cents)) : '')
    setNotes(record?.notes ?? '')
    setEditing({ record })
  }

  const submit = () => {
    const payload = {
      period,
      amount_cents: wonToCents(amount) ?? 0,
      notes,
    }
    if (editing?.record) {
      update.mutate(
        { rid: editing.record.id, payload: { ...editing.record, ...payload } },
        { onSuccess: () => setEditing(null) },
      )
    } else {
      create.mutate(payload, { onSuccess: () => setEditing(null) })
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/more/expenses">
            <Button variant="ghost" size="icon" aria-label={t('common.cancel')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            {expense.data?.name ?? '...'} · {t('expense.records')}
          </h1>
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4" />
          {t('common.add')}
        </Button>
      </div>

      {records.isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : !records.data || records.data.length === 0 ? (
        <div className="rounded-lg bg-tint-lavender px-4 py-12 text-center">
          <p className="text-sm font-medium">{t('common.empty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('expense.recordsHint')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {records.data.map((r) => (
            <li key={r.id}>
              <Card className="flex h-full flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium">{r.period}</h2>
                    <p className="text-lg font-semibold tracking-tight">{formatCents(r.amount_cents)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => openDialog(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.delete')}
                      onClick={() => {
                        if (window.confirm(t('common.confirmDelete'))) remove.mutate(r.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {r.notes ? <p className="text-sm text-body">{r.notes}</p> : null}
                <div className="mt-auto space-y-1 border-t pt-2">
                  {docsFor(r.id).map((d) => (
                    <a
                      key={d.id}
                      href={`/api/documents/${d.id}/download`}
                      download
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {d.title || d.file_name}
                    </a>
                  ))}
                  <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    {t('expense.attachBill')}
                    <input
                      ref={(el) => {
                        fileRefs.current[r.id] = el
                      }}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) attach.mutate({ rid: r.id, file: f })
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.record ? t('expense.editRecord') : t('expense.addRecord')}
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">{t('expense.period')}</span>
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">{t('expense.amount')}</span>
            <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">{t('common.notes')}</span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {(create.error ?? update.error) ? (
            <p className="text-sm text-destructive">{(create.error ?? update.error)?.message}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={create.isPending || update.isPending || !period}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
