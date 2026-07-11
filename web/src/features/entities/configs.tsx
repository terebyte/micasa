import type { EntityConfig } from './framework'
import { formatCents, formatDate, isOverdue } from '../../lib/format'

// Enum options reference i18n keys under enum.* so labels localize.
const opt = (value: string, key: string) => ({ value, label: `enum.${key}` })

export const roomsConfig: EntityConfig = {
  apiPath: '/rooms',
  i18nKey: 'room',
  titleField: 'name',
  fields: [
    { key: 'name', labelKey: 'room.name', type: 'text', required: true },
    { key: 'floor', labelKey: 'room.floor', type: 'number' },
    { key: 'notes', labelKey: 'common.notes', type: 'textarea' },
  ],
}

export const vendorsConfig: EntityConfig = {
  apiPath: '/vendors',
  i18nKey: 'vendor',
  titleField: 'name',
  subtitleField: 'phone',
  fields: [
    { key: 'name', labelKey: 'vendor.name', type: 'text', required: true },
    { key: 'contact_name', labelKey: 'vendor.contactName', type: 'text' },
    { key: 'phone', labelKey: 'vendor.phone', type: 'text' },
    { key: 'email', labelKey: 'vendor.email', type: 'text' },
    { key: 'website', labelKey: 'vendor.website', type: 'text' },
    { key: 'notes', labelKey: 'common.notes', type: 'textarea' },
  ],
}

export const projectsConfig: EntityConfig = {
  apiPath: '/projects',
  i18nKey: 'project',
  titleField: 'title',
  fields: [
    { key: 'title', labelKey: 'project.name', type: 'text', required: true },
    {
      key: 'project_type_id',
      labelKey: 'project.type',
      type: 'select',
      required: true,
      optionsPath: '/project-types',
      clearable: false,
    },
    {
      key: 'status',
      labelKey: 'common.status',
      type: 'select',
      required: true,
      clearable: false,
      staticOptions: [
        opt('ideating', 'projectStatus.ideating'),
        opt('planned', 'projectStatus.planned'),
        opt('quoted', 'projectStatus.quoted'),
        opt('underway', 'projectStatus.underway'),
        opt('delayed', 'projectStatus.delayed'),
        opt('completed', 'projectStatus.completed'),
        opt('abandoned', 'projectStatus.abandoned'),
      ],
    },
    { key: 'description', labelKey: 'common.description', type: 'textarea' },
    { key: 'start_date', labelKey: 'project.startDate', type: 'date' },
    { key: 'end_date', labelKey: 'project.endDate', type: 'date' },
    { key: 'budget_cents', labelKey: 'project.budget', type: 'money' },
    { key: 'actual_cents', labelKey: 'project.actual', type: 'money' },
  ],
  cardMeta: (item, t) => (
    <p className="text-sm text-muted-foreground">
      {t(`enum.projectStatus.${String(item.status)}`)}
      {item.budget_cents != null ? ` · ${formatCents(item.budget_cents as number)}` : ''}
    </p>
  ),
}

export const maintenanceConfig: EntityConfig = {
  apiPath: '/maintenance',
  i18nKey: 'maintenance',
  titleField: 'name',
  fields: [
    { key: 'name', labelKey: 'maintenance.name', type: 'text', required: true },
    {
      key: 'category_id',
      labelKey: 'maintenance.category',
      type: 'select',
      required: true,
      optionsPath: '/maintenance-categories',
      clearable: false,
    },
    { key: 'appliance_id', labelKey: 'maintenance.appliance', type: 'select', optionsPath: '/appliances' },
    {
      key: 'season',
      labelKey: 'maintenance.season',
      type: 'select',
      staticOptions: [
        opt('spring', 'season.spring'),
        opt('summer', 'season.summer'),
        opt('fall', 'season.fall'),
        opt('winter', 'season.winter'),
      ],
    },
    { key: 'interval_months', labelKey: 'maintenance.intervalMonths', type: 'number' },
    { key: 'last_serviced_at', labelKey: 'maintenance.lastServiced', type: 'date' },
    { key: 'due_date', labelKey: 'maintenance.dueDate', type: 'date' },
    { key: 'notes', labelKey: 'common.notes', type: 'textarea' },
  ],
  cardMeta: (item, t) => {
    const due = item.due_date as string | null
    return due ? (
      <p className={`text-sm ${isOverdue(due) ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
        {t('maintenance.dueDate')}: {formatDate(due)}
      </p>
    ) : null
  },
}

export const incidentsConfig: EntityConfig = {
  apiPath: '/incidents',
  i18nKey: 'incident',
  titleField: 'title',
  subtitleField: 'location',
  fields: [
    { key: 'title', labelKey: 'incident.name', type: 'text', required: true },
    {
      key: 'severity',
      labelKey: 'incident.severity',
      type: 'select',
      required: true,
      clearable: false,
      staticOptions: [
        opt('urgent', 'severity.urgent'),
        opt('soon', 'severity.soon'),
        opt('whenever', 'severity.whenever'),
      ],
    },
    {
      key: 'status',
      labelKey: 'common.status',
      type: 'select',
      required: true,
      clearable: false,
      staticOptions: [
        opt('open', 'incidentStatus.open'),
        opt('in_progress', 'incidentStatus.in_progress'),
        opt('resolved', 'incidentStatus.resolved'),
      ],
    },
    { key: 'description', labelKey: 'common.description', type: 'textarea' },
    { key: 'location', labelKey: 'common.location', type: 'text' },
    { key: 'date_noticed', labelKey: 'incident.dateNoticed', type: 'date' },
    { key: 'date_resolved', labelKey: 'incident.dateResolved', type: 'date' },
    { key: 'appliance_id', labelKey: 'maintenance.appliance', type: 'select', optionsPath: '/appliances' },
    { key: 'cost_cents', labelKey: 'common.cost', type: 'money' },
    { key: 'notes', labelKey: 'common.notes', type: 'textarea' },
  ],
  cardMeta: (item, t) => (
    <p className="text-sm text-muted-foreground">
      {t(`enum.severity.${String(item.severity)}`)} · {t(`enum.incidentStatus.${String(item.status)}`)}
    </p>
  ),
}

export const quotesConfig: EntityConfig = {
  apiPath: '/quotes',
  i18nKey: 'quote',
  titleField: 'notes',
  fields: [
    {
      key: 'project_id',
      labelKey: 'quote.project',
      type: 'select',
      required: true,
      optionsPath: '/projects',
      optionLabelField: 'title',
      clearable: false,
    },
    { key: 'vendor_name', labelKey: 'quote.vendorName', type: 'text', required: true, placeholderKey: 'quote.vendorHint' },
    { key: 'total_cents', labelKey: 'quote.total', type: 'money', required: true },
    { key: 'labor_cents', labelKey: 'quote.labor', type: 'money' },
    { key: 'materials_cents', labelKey: 'quote.materials', type: 'money' },
    { key: 'received_date', labelKey: 'quote.receivedDate', type: 'date' },
    { key: 'notes', labelKey: 'common.notes', type: 'textarea' },
  ],
  cardMeta: (item) => (
    <p className="text-sm text-muted-foreground">{formatCents(item.total_cents as number)}</p>
  ),
}

export const serviceLogsConfig: EntityConfig = {
  apiPath: '/service-logs',
  i18nKey: 'serviceLog',
  titleField: 'notes',
  fields: [
    {
      key: 'maintenance_item_id',
      labelKey: 'serviceLog.maintenanceItem',
      type: 'select',
      required: true,
      optionsPath: '/maintenance',
      clearable: false,
    },
    { key: 'serviced_at', labelKey: 'serviceLog.servicedAt', type: 'date', required: true },
    { key: 'vendor_name', labelKey: 'quote.vendorName', type: 'text', placeholderKey: 'quote.vendorHint' },
    { key: 'cost_cents', labelKey: 'common.cost', type: 'money' },
    { key: 'notes', labelKey: 'common.notes', type: 'textarea' },
  ],
  cardMeta: (item) => (
    <p className="text-sm text-muted-foreground">
      {formatDate(item.serviced_at as string)}
      {item.cost_cents != null ? ` · ${formatCents(item.cost_cents as number)}` : ''}
    </p>
  ),
}
