import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  DoorOpen,
  Lightbulb,
  Package,
  Pencil,
  Plus,
  Refrigerator,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Dialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'

interface FloorPlan {
  id: string
  name: string
  floor: number
}

interface Marker {
  id: string
  floor_plan_id: string
  x: number
  y: number
  label: string
  kind: 'room' | 'appliance' | 'asset' | 'ha'
  room_id: string | null
  appliance_id: string | null
  asset_id: string | null
  ha_entity: string
}

interface Doc {
  id: string
}

interface HAState {
  entity_id: string
  state: string
}

interface Named {
  id: string
  name: string
}

const kindIcon = {
  room: DoorOpen,
  appliance: Refrigerator,
  asset: Package,
  ha: Lightbulb,
}

async function uploadPlanImage(planID: string, file: File): Promise<void> {
  const form = new FormData()
  form.set('file', file)
  form.set('title', file.name)
  form.set('entity_kind', 'floor_plan')
  form.set('entity_id', planID)
  const res = await fetch('/api/documents', { method: 'POST', body: form })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `HTTP ${res.status}`)
  }
}

function TargetSelect({
  path,
  value,
  onChange,
  labelKey,
}: {
  path: string
  value: string
  onChange: (v: string) => void
  labelKey: string
}) {
  const { t } = useTranslation()
  const options = useQuery({ queryKey: [path], queryFn: () => api.get<Named[]>(path) })
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-body">{t(labelKey)}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm sm:h-10"
      >
        <option value="">{t('common.none')}</option>
        {(options.data ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function MarkerForm({
  initial,
  onSubmit,
  onDelete,
  onCancel,
  pending,
}: {
  initial: Partial<Marker>
  onSubmit: (m: Partial<Marker>) => void
  onDelete?: () => void
  onCancel: () => void
  pending: boolean
}) {
  const { t } = useTranslation()
  const [label, setLabel] = useState(initial.label ?? '')
  const [kind, setKind] = useState<Marker['kind']>(initial.kind ?? 'ha')
  const [roomID, setRoomID] = useState(initial.room_id ?? '')
  const [applianceID, setApplianceID] = useState(initial.appliance_id ?? '')
  const [assetID, setAssetID] = useState(initial.asset_id ?? '')
  const [haEntity, setHAEntity] = useState(initial.ha_entity ?? '')

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-body">{t('floorplan.markerLabel')}</span>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-body">{t('floorplan.markerKind')}</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Marker['kind'])}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm sm:h-10"
        >
          <option value="ha">{t('floorplan.kindHA')}</option>
          <option value="appliance">{t('floorplan.kindAppliance')}</option>
          <option value="asset">{t('floorplan.kindAsset')}</option>
          <option value="room">{t('floorplan.kindRoom')}</option>
        </select>
      </label>
      {kind === 'room' ? (
        <TargetSelect path="/rooms" value={roomID} onChange={setRoomID} labelKey="room.title" />
      ) : null}
      {kind === 'appliance' ? (
        <TargetSelect path="/appliances" value={applianceID} onChange={setApplianceID} labelKey="appliance.title" />
      ) : null}
      {kind === 'asset' ? (
        <TargetSelect path="/assets" value={assetID} onChange={setAssetID} labelKey="asset.title" />
      ) : null}
      {kind === 'ha' ? (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-body">{t('floorplan.haEntity')}</span>
          <Input value={haEntity} onChange={(e) => setHAEntity(e.target.value)} placeholder="light.living_room" />
        </label>
      ) : null}
      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={onDelete} disabled={pending}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              onSubmit({
                label,
                kind,
                room_id: kind === 'room' && roomID ? roomID : null,
                appliance_id: kind === 'appliance' && applianceID ? applianceID : null,
                asset_id: kind === 'asset' && assetID ? assetID : null,
                ha_entity: kind === 'ha' ? haEntity : '',
              })
            }
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function FloorplanPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const plans = useQuery({
    queryKey: ['floorplans'],
    queryFn: () => api.get<FloorPlan[]>('/floorplans'),
  })
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const plan = plans.data?.find((p) => p.id === selectedID) ?? plans.data?.[0]

  const [editMode, setEditMode] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const imgWrapRef = useRef<HTMLDivElement>(null)

  const invalidatePlans = () => qc.invalidateQueries({ queryKey: ['floorplans'] })
  const createPlan = useMutation({
    mutationFn: (name: string) => api.post<FloorPlan>('/floorplans', { name }),
    onSuccess: (created) => {
      invalidatePlans()
      setSelectedID(created.id)
      setNewPlanName('')
    },
  })
  const updatePlan = useMutation({
    mutationFn: (p: FloorPlan) => api.put<FloorPlan>(`/floorplans/${p.id}`, p),
    onSuccess: invalidatePlans,
  })
  const deletePlan = useMutation({
    mutationFn: (id: string) => api.del(`/floorplans/${id}`),
    onSuccess: () => {
      invalidatePlans()
      setSelectedID(null)
    },
  })

  const image = useQuery({
    queryKey: ['plan-image', plan?.id],
    queryFn: () => api.get<Doc[]>(`/documents?entity_kind=floor_plan&entity_id=${plan!.id}`),
    enabled: Boolean(plan),
  })
  const imageDoc = image.data?.[0]

  const upload = useMutation({
    mutationFn: (file: File) => uploadPlanImage(plan!.id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-image', plan?.id] }),
  })
  const replaceImage = useMutation({
    mutationFn: async (file: File) => {
      if (imageDoc) await api.del(`/documents/${imageDoc.id}`)
      await uploadPlanImage(plan!.id, file)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-image', plan?.id] }),
    onError: (err) => window.alert(err.message),
  })

  const markers = useQuery({
    queryKey: ['markers', plan?.id],
    queryFn: () => api.get<Marker[]>(`/floorplans/${plan!.id}/markers`),
    enabled: Boolean(plan),
  })

  const haIDs = (markers.data ?? [])
    .filter((m) => m.kind === 'ha' && m.ha_entity)
    .map((m) => m.ha_entity)
  const haStates = useQuery({
    queryKey: ['ha-states', haIDs.join(',')],
    queryFn: () => api.get<HAState[]>(`/ha/states?ids=${encodeURIComponent(haIDs.join(','))}`),
    enabled: haIDs.length > 0,
    refetchInterval: 10_000,
    retry: false,
  })
  const stateOf = (entity: string) => haStates.data?.find((s) => s.entity_id === entity)?.state

  const invalidateMarkers = () => qc.invalidateQueries({ queryKey: ['markers', plan?.id] })
  const createMarker = useMutation({
    mutationFn: (m: Partial<Marker>) => api.post<Marker>(`/floorplans/${plan!.id}/markers`, m),
    onSuccess: invalidateMarkers,
  })
  const updateMarker = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Marker> }) =>
      api.put<Marker>(`/markers/${id}`, patch),
    onSuccess: invalidateMarkers,
  })
  const deleteMarker = useMutation({
    mutationFn: (id: string) => api.del(`/markers/${id}`),
    onSuccess: invalidateMarkers,
  })
  const toggle = useMutation({
    mutationFn: (entity: string) => api.post<void>('/ha/toggle', { entity_id: entity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ha-states'] }),
    onError: (err) => window.alert(err.message),
  })

  const [dialog, setDialog] = useState<
    { mode: 'new'; x: number; y: number } | { mode: 'edit'; marker: Marker } | null
  >(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // Drag-to-move markers in edit mode (pointer events cover touch).
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)

  const percentAt = (clientX: number, clientY: number) => {
    const rect = imgWrapRef.current!.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !imgWrapRef.current) return
    const { x, y } = percentAt(e.clientX, e.clientY)
    setDrag({ ...drag, x, y, moved: true })
  }

  const onPointerUp = () => {
    if (!drag) return
    if (drag.moved) {
      const marker = markers.data?.find((m) => m.id === drag.id)
      if (marker) {
        updateMarker.mutate({ id: drag.id, patch: { ...marker, x: drag.x, y: drag.y } })
      }
      suppressClick.current = true
    }
    setDrag(null)
  }

  const onImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (!editMode || !imgWrapRef.current) return
    const { x, y } = percentAt(e.clientX, e.clientY)
    setDialog({ mode: 'new', x, y })
  }

  const onMarkerClick = (marker: Marker) => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (editMode) {
      setDialog({ mode: 'edit', marker })
      return
    }
    switch (marker.kind) {
      case 'appliance':
        navigate('/appliances')
        break
      case 'asset':
        navigate('/more/assets')
        break
      case 'room':
        navigate('/more/rooms')
        break
      case 'ha':
        if (marker.ha_entity) toggle.mutate(marker.ha_entity)
        break
    }
  }

  if (plans.isLoading) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{t('floorplan.title')}</h1>
        {plan ? (
          <div className="flex items-center gap-2">
            {plans.data && plans.data.length > 1 ? (
              <select
                value={plan.id}
                onChange={(e) => setSelectedID(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {plans.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('floorplan.planSettings')}
              onClick={() => {
                setRenameValue(plan.name)
                setSettingsOpen(true)
              }}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
            <Button variant={editMode ? 'primary' : 'secondary'} size="sm" onClick={() => setEditMode((v) => !v)}>
              <Pencil className="h-4 w-4" />
              {editMode ? t('floorplan.editing') : t('common.edit')}
            </Button>
          </div>
        ) : null}
      </div>

      {!plan ? (
        <Card className="max-w-md">
          <p className="mb-3 text-sm text-muted-foreground">{t('floorplan.emptyHint')}</p>
          <div className="flex gap-2">
            <Input
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder={t('floorplan.namePlaceholder')}
            />
            <Button
              disabled={!newPlanName.trim() || createPlan.isPending}
              onClick={() => createPlan.mutate(newPlanName.trim())}
            >
              <Plus className="h-4 w-4" />
              {t('common.add')}
            </Button>
          </div>
        </Card>
      ) : !imageDoc ? (
        <Card className="max-w-md">
          <p className="mb-3 text-sm text-muted-foreground">{t('floorplan.uploadHint')}</p>
          <input ref={fileRef} type="file" accept="image/*" className="mb-3 block w-full text-sm" />
          <Button
            disabled={upload.isPending}
            onClick={() => {
              const f = fileRef.current?.files?.[0]
              if (f) upload.mutate(f)
            }}
          >
            <Upload className="h-4 w-4" />
            {t('common.upload')}
          </Button>
          {upload.error ? <p className="mt-2 text-sm text-destructive">{upload.error.message}</p> : null}
        </Card>
      ) : (
        <>
          {editMode ? (
            <p className="mb-2 text-sm text-muted-foreground">
              {t('floorplan.tapToAdd')} · {t('floorplan.dragHint')}
            </p>
          ) : null}
          <div
            ref={imgWrapRef}
            className={cn(
              'relative inline-block max-w-full overflow-hidden rounded-lg border',
              editMode && 'cursor-crosshair',
            )}
            onClick={onImageClick}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <img
              src={`/api/documents/${imageDoc.id}/download`}
              alt={plan.name}
              className="block max-h-[75vh] w-auto max-w-full select-none"
              draggable={false}
            />
            {(markers.data ?? []).map((m) => {
              const Icon = kindIcon[m.kind] ?? Lightbulb
              const state = m.kind === 'ha' ? stateOf(m.ha_entity) : undefined
              const pos = drag && drag.id === m.id ? drag : m
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-label={m.label || m.kind}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkerClick(m)
                  }}
                  onPointerDown={(e) => {
                    if (!editMode) return
                    e.stopPropagation()
                    setDrag({ id: m.id, x: m.x, y: m.y, moved: false })
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, touchAction: editMode ? 'none' : undefined }}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-transform active:scale-95',
                      state === 'on' ? 'bg-tint-yellow border-foreground/20' : 'bg-card/95 border-border',
                      drag?.id === m.id && 'ring-2 ring-ring',
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  {m.label ? (
                    <span className="mt-0.5 block rounded bg-card/90 px-1 text-center text-[10px] leading-4">
                      {m.label}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </>
      )}

      <Dialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'edit' ? t('floorplan.editMarker') : t('floorplan.addMarker')}
      >
        {dialog ? (
          <MarkerForm
            initial={dialog.mode === 'edit' ? dialog.marker : {}}
            pending={createMarker.isPending || updateMarker.isPending || deleteMarker.isPending}
            onCancel={() => setDialog(null)}
            onDelete={
              dialog.mode === 'edit'
                ? () => {
                    if (window.confirm(t('common.confirmDelete'))) {
                      deleteMarker.mutate(dialog.marker.id, { onSuccess: () => setDialog(null) })
                    }
                  }
                : undefined
            }
            onSubmit={(patch) => {
              if (dialog.mode === 'new') {
                createMarker.mutate({ ...patch, x: dialog.x, y: dialog.y }, { onSuccess: () => setDialog(null) })
              } else {
                updateMarker.mutate(
                  { id: dialog.marker.id, patch: { ...dialog.marker, ...patch } },
                  { onSuccess: () => setDialog(null) },
                )
              }
            }}
          />
        ) : null}
      </Dialog>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('floorplan.planSettings')}>
        {plan ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-body">{t('floorplan.rename')}</span>
              <div className="flex gap-2">
                <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
                <Button
                  variant="secondary"
                  disabled={!renameValue.trim() || updatePlan.isPending}
                  onClick={() => updatePlan.mutate({ ...plan, name: renameValue.trim() })}
                >
                  {t('common.save')}
                </Button>
              </div>
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-body">{t('floorplan.replaceImage')}</span>
              <div className="flex items-center gap-2">
                <input ref={replaceRef} type="file" accept="image/*" className="block w-full text-sm" />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={replaceImage.isPending}
                  onClick={() => {
                    const f = replaceRef.current?.files?.[0]
                    if (f) replaceImage.mutate(f)
                  }}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="border-t pt-4">
              <Button
                variant="destructive"
                size="sm"
                disabled={deletePlan.isPending}
                onClick={() => {
                  if (window.confirm(t('floorplan.deletePlanConfirm'))) {
                    deletePlan.mutate(plan.id, { onSuccess: () => setSettingsOpen(false) })
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                {t('floorplan.deletePlan')}
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </section>
  )
}
