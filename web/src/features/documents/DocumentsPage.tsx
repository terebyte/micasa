import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Dialog } from '../../components/ui/dialog'
import { Input, Textarea } from '../../components/ui/input'

interface Doc {
  id: string
  title: string
  file_name: string
  mime_type: string
  size_bytes: number
  notes: string
  created_at: string
}

async function upload(form: FormData): Promise<Doc> {
  const res = await fetch('/api/documents', { method: 'POST', body: form })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
  return (await res.json()) as Doc
}

export function DocumentsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get<Doc[]>('/documents'),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['documents'] })

  const create = useMutation({ mutationFn: upload, onSuccess: invalidate })
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/documents/${id}`),
    onSuccess: invalidate,
  })

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const form = new FormData()
    form.set('file', file)
    form.set('title', title)
    form.set('notes', notes)
    create.mutate(form, {
      onSuccess: () => {
        setOpen(false)
        setTitle('')
        setNotes('')
      },
    })
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t('document.title')}</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('common.upload')}
        </Button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg bg-tint-lavender px-4 py-12 text-center">
          <p className="text-sm font-medium">{t('common.empty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('document.emptyHint')}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.map((doc) => (
            <li key={doc.id}>
              <Card className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-medium">{doc.title || doc.file_name}</h2>
                  <p className="truncate text-sm text-muted-foreground">
                    {doc.file_name} · {formatDate(doc.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <a href={`/api/documents/${doc.id}/download`} download>
                    <Button variant="ghost" size="icon" aria-label={t('common.download')}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                    onClick={() => {
                      if (window.confirm(t('common.confirmDelete'))) remove.mutate(doc.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={t('document.addTitle')}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">{t('common.file')} *</span>
            <input ref={fileRef} type="file" className="block w-full text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">{t('document.name')}</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-body">{t('common.notes')}</span>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {create.error ? <p className="text-sm text-destructive">{create.error.message}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={create.isPending}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={create.isPending}>
              {t('common.upload')}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  )
}
