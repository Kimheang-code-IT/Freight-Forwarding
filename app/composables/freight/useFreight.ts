import type { FreightField, FreightModule } from '~/config/freight-modules'
import { getFreightModule } from '~/config/freight-modules'
import { JOB_CHECKLIST_TYPES } from '~/config/freight-options'

export function useFreightLabel() {
  const { locale } = useI18n()
  const km = computed(() => locale.value === 'km')

  function fieldLabel(field: Pick<FreightField, 'label' | 'labelKm'>) {
    return km.value && field.labelKm ? field.labelKm : field.label
  }

  function moduleTitle(module: FreightModule) {
    return km.value ? module.titleKm : module.title
  }

  function moduleSingular(module: FreightModule) {
    return km.value ? module.singularKm : module.singular
  }

  function sectionTitle(field: FreightField) {
    return km.value && field.sectionKm ? field.sectionKm : (field.section || '')
  }

  return { km, fieldLabel, moduleTitle, moduleSingular, sectionTitle }
}

export function useFreightRouteModule() {
  const route = useRoute()
  const module = computed(() => getFreightModule(route.path))
  const isCreate = computed(() => route.path.endsWith('/new') || route.params.id === 'new')
  const recordId = computed(() => isCreate.value ? '' : String(route.params.id || ''))
  return { module, isCreate, recordId, route }
}

export function emptyFreightRecord(module: FreightModule) {
  const record: Record<string, unknown> = { id: '', status: module.statuses?.[0] || 'Active' }
  for (const field of module.fields) {
    if (field.type === 'number') record[field.key] = 0
    else if (field.type === 'multiselect') record[field.key] = []
    else if (field.type === 'date') record[field.key] = new Date().toISOString().slice(0, 10)
    else record[field.key] = ''
  }
  for (const table of module.tables || []) {
    record[table.key] = table.presets ? table.presets.map(row => ({ ...row })) : []
  }
  if (module.kind === 'job') {
    record.checklist = JOB_CHECKLIST_TYPES.map(type => ({ type, required: true, status: 'Missing', remark: '' }))
    record.activity = []
  }
  return record
}

export function groupedFields(module: FreightModule) {
  const groups: Array<{ title: string, titleKm?: string, fields: FreightField[] }> = []
  for (const field of module.fields) {
    const title = field.section || 'General'
    const current = groups.find(group => group.title === title)
    if (current) current.fields.push(field)
    else groups.push({ title, titleKm: field.sectionKm, fields: [field] })
  }
  return groups
}

export function statusColor(status: string) {
  const value = status.toLowerCase()
  if (['active', 'paid', 'cleared', 'delivered', 'approved', 'accepted', 'closed', 'completed', 'pod received'].some(s => value.includes(s))) return 'success'
  if (['pending', 'processing', 'partial', 'in transit', 'arriving', 'submitted', 'sent'].some(s => value.includes(s))) return 'warning'
  if (['inactive', 'overdue', 'missing', 'on hold', 'expired', 'unpaid'].some(s => value.includes(s))) return 'error'
  return 'neutral'
}

export function asNumber(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
}

export function formatMoney(value: unknown) {
  const n = asNumber(value)
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
