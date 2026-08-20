import { defineStore } from 'pinia'
import { freightModules, type FreightModule } from '~/config/freight-modules'
import {
  createFreightSeed,
  derivePayables,
  deriveProfitability,
  deriveReceivables,
  type FreightRecord,
} from '~/config/freight-seed'

const STORAGE_KEY = 'lcs-freight-data-v1'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const useFreightStore = defineStore('freight', () => {
  const collections = ref<Record<string, FreightRecord[]>>(createFreightSeed())
  const hydrated = ref(false)

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections.value))
  }

  function hydrate() {
    if (hydrated.value || !import.meta.client) return
    hydrated.value = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) collections.value = JSON.parse(raw) as Record<string, FreightRecord[]>
      else persist()
    }
    catch {
      persist()
    }
  }

  function moduleByPath(path: string) {
    return freightModules.find(module => module.path === path)
  }

  function list(collection: string): FreightRecord[] {
    hydrate()
    if (collection === 'receivables') {
      return deriveReceivables(collections.value.debitNotes || [], collections.value.customerPayments || [])
    }
    if (collection === 'payables') {
      return derivePayables(collections.value.supplierCosts || [], collections.value.supplierPayments || [])
    }
    if (collection === 'profitability') {
      return deriveProfitability(collections.value.jobs || [], collections.value.debitNotes || [], collections.value.supplierCosts || [])
    }
    return collections.value[collection] || []
  }

  function get(collection: string, id: string) {
    return list(collection).find(row => row.id === id) || null
  }

  function save(collection: string, record: FreightRecord): FreightRecord {
    hydrate()
    if (['receivables', 'payables', 'profitability'].includes(collection)) return record
    const rows = collections.value[collection] ? [...collections.value[collection]] : []
    const index = rows.findIndex(row => row.id === record.id)
    const next: FreightRecord = { ...record, updatedAt: new Date().toISOString() }
    if (index >= 0) rows[index] = next
    else rows.unshift({ ...next, createdAt: new Date().toISOString() })
    collections.value = { ...collections.value, [collection]: rows }
    persist()
    return next
  }

  function create(collection: string, data: Record<string, unknown>, prefix = 'rec'): FreightRecord {
    const { id: _ignored, ...rest } = data
    const record = { ...rest, id: newId(prefix) } as FreightRecord
    return save(collection, record)
  }

  function remove(collection: string, ids: string[]) {
    hydrate()
    const rows = (collections.value[collection] || []).filter(row => !ids.includes(row.id))
    collections.value = { ...collections.value, [collection]: rows }
    persist()
  }

  function duplicate(collection: string, id: string, overrides: Record<string, unknown> = {}): FreightRecord | null {
    const source = get(collection, id)
    if (!source) return null
    const copy = clone(source)
    delete (copy as { createdAt?: string }).createdAt
    delete (copy as { id?: string }).id
    return create(collection, { ...copy, ...overrides }, collection.slice(0, 3))
  }

  function addAudit(action: string, module: string, recordNo: string, remark = '') {
    const auth = useAuthStore()
    create('auditLogs', {
      occurredAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      user: auth.user?.name || 'System',
      action,
      module,
      recordNo,
      remark,
    }, 'log')
  }

  function query(module: FreightModule, options: {
    q?: string
    filters?: Record<string, string>
    page?: number
    limit?: number
    paginate?: boolean
    dateField?: string
    dateFrom?: string
    dateTo?: string
    sortKey?: string
    sortDir?: 'asc' | 'desc'
  }) {
    const q = (options.q || '').trim().toLowerCase()
    const filters = options.filters || {}
    let rows = list(module.collection)
    if (q) {
      rows = rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(q)))
    }
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue
      rows = rows.filter(row => String(row[key] ?? '') === value)
    }
    const dateField = options.dateField
    const dateFrom = (options.dateFrom || '').slice(0, 10)
    const dateTo = (options.dateTo || '').slice(0, 10)
    if (dateField && (dateFrom || dateTo)) {
      rows = rows.filter((row) => {
        const day = String(row[dateField] ?? '').slice(0, 10)
        if (!day) return false
        if (dateFrom && day < dateFrom) return false
        if (dateTo && day > dateTo) return false
        return true
      })
    }
    if (options.sortKey && options.sortDir) {
      const dir = options.sortDir === 'desc' ? -1 : 1
      const sortKey = options.sortKey
      rows = [...rows].sort((a, b) => String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), undefined, { numeric: true }) * dir)
    }
    const page = options.page || 1
    const limit = options.limit || 10
    const start = (page - 1) * limit
    return {
      rows: options.paginate === false ? rows : rows.slice(start, start + limit),
      total: rows.length,
      all: rows,
    }
  }

  function related(module: FreightModule, record: FreightRecord) {
    return (module.related || []).map((item) => {
      const target = moduleByPath(item.path)
      const rows = target ? list(target.collection).filter(row => String(row[item.foreignKey] ?? '') === String(record[item.localKey] ?? '')) : []
      return { ...item, rows, module: target }
    })
  }

  const dashboard = computed(() => {
    hydrate()
    const jobs = list('jobs')
    const today = new Date().toISOString().slice(0, 10)
    const customs = list('customs')
    const deliveries = list('deliveries')
    const receivables = list('receivables')
    const payables = list('payables')
    const profit = list('profitability')
    const documents = list('documents')
    const kpis = [
      { id: 'jobsToday', label: 'Jobs Today', labelKm: 'ការងារថ្ងៃនេះ', value: jobs.filter(j => String(j.date) === today).length, to: '/operations/jobs' },
      { id: 'import', label: 'Import Jobs', labelKm: 'ការងារនាំចូល', value: jobs.filter(j => j.direction === 'Import').length, to: '/operations/jobs' },
      { id: 'export', label: 'Export Jobs', labelKm: 'ការងារនាំចេញ', value: jobs.filter(j => j.direction === 'Export').length, to: '/operations/jobs' },
      { id: 'inTransit', label: 'In Transit', labelKm: 'កំពុងដឹក', value: jobs.filter(j => j.status === 'In Transit').length, to: '/operations/jobs' },
      { id: 'pendingCustoms', label: 'Pending Customs', labelKm: 'រង់ចាំគយ', value: jobs.filter(j => ['Customs Processing', 'Documents Received', 'Transport Registered'].includes(String(j.status))).length, to: '/operations/customs' },
      { id: 'cleared', label: 'Customs Cleared', labelKm: 'គយបានបញ្ចេញ', value: jobs.filter(j => ['Customs Cleared', 'In Transit', 'Arrived Factory', 'Delivered', 'Closed'].includes(String(j.status))).length, to: '/operations/customs' },
      { id: 'pendingDelivery', label: 'Pending Delivery', labelKm: 'រង់ចាំប្រគល់', value: jobs.filter(j => ['Customs Cleared', 'In Transit', 'Arrived Factory'].includes(String(j.status))).length, to: '/operations/deliveries' },
      { id: 'completed', label: 'Completed Jobs', labelKm: 'ការងារបានបញ្ចប់', value: jobs.filter(j => ['Delivered', 'Financial Completed', 'Closed'].includes(String(j.status))).length, to: '/operations/jobs' },
      { id: 'ar', label: 'Customer Receivable', labelKm: 'ត្រូវទទួល', value: `$${receivables.reduce((s, r) => s + Number(r.outstanding || 0), 0).toLocaleString()}`, to: '/finance/accounts-receivable' },
      { id: 'ap', label: 'Supplier Payable', labelKm: 'ត្រូវបង់', value: `$${payables.reduce((s, r) => s + Number(r.outstanding || 0), 0).toLocaleString()}`, to: '/finance/accounts-payable' },
      { id: 'revenue', label: 'Total Revenue', labelKm: 'ចំណូលសរុប', value: `$${profit.reduce((s, r) => s + Number(r.revenue || 0), 0).toLocaleString()}`, to: '/finance/job-profitability' },
      { id: 'cost', label: 'Total Cost', labelKm: 'ថ្លៃសរុប', value: `$${profit.reduce((s, r) => s + Number(r.totalCost || 0), 0).toLocaleString()}`, to: '/finance/job-charges' },
      { id: 'profit', label: 'Monthly Profit', labelKm: 'ប្រាក់ចំណេញប្រចាំខែ', value: `$${profit.reduce((s, r) => s + Number(r.profit || 0), 0).toLocaleString()}`, to: '/finance/job-profitability' },
    ]
    const recentJobs = jobs.slice(0, 8)
    const alerts = [
      { id: 'eta', title: 'Containers arriving soon', titleKm: 'កុងតឺន័រនឹងមកដល់ឆាប់ៗ', tone: 'warning' as const, items: deliveries.filter(d => ['Arriving', 'Scheduled'].includes(String(d.status))).map(d => `${d.jobNo} · ${d.containerNo} · ETA ${d.etaFactory}`) },
      { id: 'docs', title: 'Missing documents', titleKm: 'ឯកសារខ្វះ', tone: 'error' as const, items: [
        ...documents.filter(d => d.status === 'Missing' || String(d.remark || '').toLowerCase().includes('missing')).map(d => `${d.jobNo} · ${d.documentType}`),
        ...jobs.flatMap(job => (Array.isArray(job.checklist) ? job.checklist as Array<Record<string, unknown>> : [])
          .filter(item => item.required && item.status === 'Missing')
          .map(item => `${job.jobNo} · ${item.type}`)),
      ].slice(0, 8) },
      { id: 'customs', title: 'Pending customs', titleKm: 'រង់ចាំគយ', tone: 'warning' as const, items: customs.filter(c => ['Preparing', 'Submitted', 'Processing', 'On Hold'].includes(String(c.status))).map(c => `${c.jobNo} · ${c.customsNo} · ${c.status}`) },
      { id: 'delivery', title: 'Pending delivery', titleKm: 'រង់ចាំប្រគល់', tone: 'info' as const, items: deliveries.filter(d => ['Scheduled', 'Arriving', 'Unloading'].includes(String(d.status))).map(d => `${d.jobNo} · ${d.factory}`) },
      { id: 'unpaid', title: 'Unpaid customer invoices', titleKm: 'វិក្កយបត្រអតិថិជនមិនទាន់បង់', tone: 'error' as const, items: receivables.filter(r => Number(r.outstanding) > 0).map(r => `${r.customer} · ${r.invoiceNo} · $${r.outstanding}`) },
      { id: 'supplierDue', title: 'Supplier payment due', titleKm: 'ដល់ពេលបង់អ្នកផ្គត់ផ្គង់', tone: 'warning' as const, items: payables.filter(p => Number(p.outstanding) > 0).map(p => `${p.supplier} · ${p.invoiceNo} · $${p.outstanding}`) },
    ]
    return { kpis, recentJobs, alerts }
  })

  return {
    collections,
    hydrate,
    list,
    get,
    save,
    create,
    remove,
    duplicate,
    addAudit,
    query,
    related,
    dashboard,
  }
})
