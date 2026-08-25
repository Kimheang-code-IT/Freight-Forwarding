export const JOB_WORKSPACE_SECTIONS = [
  'overview',
  'places',
  'container-requirements',
  'actual-containers',
  'components',
  'service-charges',
  'financial-documents',
  'attachments',
  'audit-timeline',
] as const

export type JobWorkspaceSection = typeof JOB_WORKSPACE_SECTIONS[number]

export const JOB_WORKSPACE_SECTION_META: Record<JobWorkspaceSection, { icon: string }> = {
  overview: { icon: 'i-lucide-layout-dashboard' },
  places: { icon: 'i-lucide-map-pinned' },
  'container-requirements': { icon: 'i-lucide-list-checks' },
  'actual-containers': { icon: 'i-lucide-container' },
  components: { icon: 'i-lucide-blocks' },
  'service-charges': { icon: 'i-lucide-receipt' },
  'financial-documents': { icon: 'i-lucide-banknote' },
  attachments: { icon: 'i-lucide-paperclip' },
  'audit-timeline': { icon: 'i-lucide-history' },
}

export const JOB_OVERVIEW_SECTIONS = new Set([
  'Job Information',
  'Commercial Information',
  'Route',
  'Dates',
  'Reference',
])

export function isJobWorkspaceSection(value: unknown): value is JobWorkspaceSection {
  return typeof value === 'string' && (JOB_WORKSPACE_SECTIONS as readonly string[]).includes(value)
}

export function parseJobWorkspaceSection(value: unknown): JobWorkspaceSection {
  if (isJobWorkspaceSection(value)) return value
  const aliases: Record<string, JobWorkspaceSection> = {
    booking: 'places',
    containers: 'actual-containers',
    documents: 'attachments',
    customs: 'components',
    tracking: 'places',
    charges: 'service-charges',
    finance: 'financial-documents',
    profit: 'financial-documents',
    activity: 'audit-timeline',
  }
  return typeof value === 'string' ? aliases[value] || 'overview' : 'overview'
}

export function jobWorkspacePath(jobId: string, section: JobWorkspaceSection = 'overview') {
  const path = `/service-orders/${jobId}`
  if (!jobId) return '/service-orders'
  if (section === 'overview') return path
  return { path, query: { section } }
}

export function workspaceSectionForPath(path: string): JobWorkspaceSection {
  if (path.includes('/operations/shipments') || path.includes('/operations/deliveries')) return 'places'
  if (path.includes('/operations/documents')) return 'attachments'
  if (path.includes('/operations/customs')) return 'components'
  if (path.includes('/finance/job-charges') || path.includes('/finance/supplier-costs')) return 'service-charges'
  if (path.includes('/finance/')) return 'financial-documents'
  return 'overview'
}

export function displayText(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item ?? '').trim()).filter(Boolean).join(', ') || '—'
  const text = String(value ?? '').trim()
  return text || '—'
}

export function isMoneyKey(key: string) {
  return /amount|total|vat|received|outstanding|paid|revenue|profit|cost|price|buying|selling|fee|subtotal/i.test(key)
    && !/date|status|type|note|method|side/i.test(key)
}

export function isNumericKey(key: string) {
  return /^(quantity|qty|daysOutstanding|margin|exchangeRate|userCount|permissionCount)$/i.test(key)
}
