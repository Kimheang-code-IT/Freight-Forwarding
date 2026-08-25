import { defineStore } from 'pinia'
import { freightModules, type FreightModule } from '~/config/freight-modules'
import {
  derivePayables,
  deriveProfitability,
  deriveReceivables,
  type FreightRecord,
} from '~/config/freight-seed'
import { getLcsDb, persistLcsDb, setLcsDb } from '~/repositories/mock/db'
import { assertMutableRecord } from '~/utils/lcs/commands'
import { financeDomainStatus, jobDomainStatus } from '~/utils/lcs/states'
import { filterScopedRecords, stampTenant } from '~/utils/lcs/scope'
import { sessionFromUser } from '~/utils/lcs/session-from-user'
import { formatLcsMoney } from '~/utils/lcs/format'
import { documentSequencePreview, normalizeDocumentSequenceRecord } from '~/utils/document-sequences'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const useFreightStore = defineStore('freight', () => {
  const revision = ref(0)
  const hydrated = ref(false)

  function session() {
    const auth = useAuthStore()
    const tenant = useTenantStore()
    return sessionFromUser(auth.user, tenant.organizationId, tenant.branchId)
  }

  const tenant = useTenantStore()
  watch(() => [tenant.organizationId, tenant.branchId, tenant.assignedBranches.length], () => {
    revision.value += 1
  })

  function persist() {
    persistLcsDb()
    revision.value += 1
  }

  function hydrate() {
    if (hydrated.value) return
    hydrated.value = true
    getLcsDb()
    revision.value += 1
  }

  function reload() {
    getLcsDb()
    revision.value += 1
  }

  const collections = computed(() => {
    void revision.value
    return getLcsDb()
  })

  function moduleByPath(path: string) {
    return freightModules.find(module => module.path === path)
  }

  function scoped(collection: string): FreightRecord[] {
    hydrate()
    const db = collections.value
    const current = session()
    if (collection === 'receivables') {
      return deriveReceivables(
        filterScopedRecords(db.debitNotes || [], current).filter(row => String(row.documentType || 'CUSTOMER_INVOICE') === 'CUSTOMER_INVOICE'),
        filterScopedRecords(db.customerPayments || [], current),
      )
    }
    if (collection === 'payables') {
      return derivePayables(
        filterScopedRecords(db.supplierCosts || [], current),
        filterScopedRecords(db.supplierPayments || [], current),
      )
    }
    if (collection === 'profitability') {
      const jobs = filterScopedRecords(db.jobs || [], current)
      const notes = filterScopedRecords(db.debitNotes || [], current).filter(row => String(row.documentType || 'CUSTOMER_INVOICE') === 'CUSTOMER_INVOICE')
      const costs = filterScopedRecords(db.supplierCosts || [], current)
      return deriveProfitability(jobs, notes, costs).map((row) => {
        const postedNotes = notes.filter(note =>
          String(note.jobNo) === String(row.jobNo) && financeDomainStatus(note.status) === 'POSTED',
        )
        const postedRevenue = postedNotes.reduce((sum, note) => sum + Number(note.total || note.amount || 0), 0)
        return {
          ...row,
          postedRevenue,
          postedProfit: Number((postedRevenue - Number(row.totalCost || 0)).toFixed(2)),
        }
      })
    }
    const rows = filterScopedRecords(db[collection] || [], current)
    if (collection === 'documentSequences') {
      const organizationName = String(useAuthStore().user?.organizationName || '')
      return rows.map(row => ({
        ...normalizeDocumentSequenceRecord(row),
        organizationName,
        nextNumberPreview: documentSequencePreview(row),
      }))
    }
    return rows
  }

  function list(collection: string): FreightRecord[] {
    return scoped(collection)
  }

  function get(collection: string, id: string) {
    return list(collection).find(row => row.id === id) || null
  }

  function getJobByNo(jobNo: string) {
    const value = jobNo.trim()
    if (!value) return null
    return list('jobs').find(row => String(row.jobNo || '') === value) || null
  }

  function save(collection: string, record: FreightRecord): FreightRecord {
    hydrate()
    if (['receivables', 'payables', 'profitability'].includes(collection)) return record
    const db = getLcsDb()
    const existing = (db[collection] || []).find(row => row.id === record.id) || null
    if (existing) {
      const visible = filterScopedRecords([existing], session())
      if (!visible.length) return existing
    }
    assertMutableRecord(collection, existing, record)
    const next = stampTenant({ ...record, updatedAt: new Date().toISOString() } as FreightRecord, session())
    const rows = db[collection] ? [...db[collection]] : []
    const index = rows.findIndex(row => row.id === next.id)
    if (index >= 0) rows[index] = next
    else rows.unshift({ ...next, createdAt: new Date().toISOString() })
    db[collection] = rows
    setLcsDb(db)
    persist()
    return next
  }

  function create(collection: string, data: Record<string, unknown>, prefix = 'rec'): FreightRecord {
    const { id: _ignored, ...rest } = data
    const record = stampTenant({ ...rest, id: newId(prefix) } as FreightRecord, session())
    return save(collection, record)
  }

  function remove(collection: string, ids: string[]) {
    hydrate()
    const db = getLcsDb()
    const current = session()
    const rows = (db[collection] || []).filter((row) => {
      if (!ids.includes(row.id)) return true
      return !filterScopedRecords([row], current).length
    })
    db[collection] = rows
    setLcsDb(db)
    persist()
  }

  function duplicate(collection: string, id: string, overrides: Record<string, unknown> = {}): FreightRecord | null {
    const source = get(collection, id)
    if (!source) return null
    const copy = clone(source)
    delete (copy as { createdAt?: string }).createdAt
    delete (copy as { id?: string }).id
    return create(collection, { ...copy, ...overrides, status: overrides.status || 'Draft' }, collection.slice(0, 3))
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
    void revision.value
    const jobs = list('jobs')
    const receivables = list('receivables')
    const payables = list('payables')
    const documents = list('documents')
    const deliveries = list('deliveries')
    const customs = list('customs')
    const components = list('serviceComponents')
    const charges = list('jobCharges')
    const financeDocs = list('debitNotes')
    const payments = list('customerPayments')
    const cash = list('cashAccounts')
    const audits = list('auditLogs')
    const locale = 'en'
    const money = (value: number) => formatLcsMoney(value, 'USD', locale)
    const kpis = [
      { id: 'openJobs', value: jobs.filter(row => ['OPEN', 'IN_PROGRESS'].includes(jobDomainStatus(row))).length, to: '/service-orders' },
      { id: 'onHold', value: jobs.filter(row => jobDomainStatus(row) === 'ON_HOLD').length, to: '/service-orders?workflowStatus=ON_HOLD' },
      { id: 'pendingComponents', value: components.filter(row => String(row.status) === 'PENDING').length, to: '/service-orders' },
      { id: 'issuedCharges', value: charges.filter(row => String(row.status) === 'Issued').length, to: '/service-charges?status=Issued' },
      { id: 'draftFinance', value: financeDocs.filter(row => financeDomainStatus(row.status) === 'DRAFT').length, to: '/finance/documents?status=Draft' },
      { id: 'overdueAr', value: money(receivables.filter(row => String(row.status) === 'Overdue').reduce((sum, row) => sum + Number(row.outstanding || 0), 0)), to: '/reports/outstanding-receivables' },
      { id: 'overdueAp', value: money(payables.filter(row => Number(row.outstanding) > 0).reduce((sum, row) => sum + Number(row.outstanding || 0), 0)), to: '/reports/outstanding-payables' },
      { id: 'unallocated', value: money(payments.reduce((sum, row) => sum + Number(row.unallocatedAmount || 0), 0)), to: '/reports/unallocated-payments' },
      { id: 'cash', value: money(cash.reduce((sum, row) => sum + Number(row.balance || 0), 0)), to: '/reports/trial-balance' },
      { id: 'recentAudit', value: audits.slice(0, 8).length, to: '/administration/audit-logs' },
    ]
    const recentJobs = jobs.filter(row => jobDomainStatus(row) !== 'CLOSED').slice(0, 8)
    const customsPending = customs.filter(row => ['Preparing', 'Submitted', 'Processing', 'On Hold'].includes(String(row.status))).slice(0, 8)
    const receivableRows = receivables.filter(row => Number(row.outstanding) > 0).slice(0, 8)
    const payableRows = payables.filter(row => Number(row.outstanding) > 0).slice(0, 8)
    const recentAudit = audits.slice(0, 8)
    const alerts = [
      { id: 'eta', tone: 'warning' as const, items: deliveries.filter(d => ['Arriving', 'Scheduled'].includes(String(d.status))).map(d => `${d.jobNo} · ${d.containerNo} · ETA ${d.etaFactory}`) },
      { id: 'docs', tone: 'error' as const, items: [
        ...documents.filter(d => d.status === 'Missing' || String(d.remark || '').toLowerCase().includes('missing')).map(d => `${d.jobNo} · ${d.documentType}`),
        ...jobs.flatMap(job => (Array.isArray(job.checklist) ? job.checklist as Array<Record<string, unknown>> : [])
          .filter(item => item.required && item.status === 'Missing')
          .map(item => `${job.jobNo} · ${item.type}`)),
      ].slice(0, 8) },
      { id: 'customs', tone: 'warning' as const, items: customs.filter(c => ['Preparing', 'Submitted', 'Processing', 'On Hold'].includes(String(c.status))).map(c => `${c.jobNo} · ${c.customsNo} · ${c.status}`) },
      { id: 'unallocated', tone: 'warning' as const, items: payments.filter(p => Number(p.unallocatedAmount) > 0).map(p => `${p.paymentNo} · ${formatLcsMoney(p.unallocatedAmount)}`) },
      { id: 'audit', tone: 'info' as const, items: audits.slice(0, 6).map(a => `${a.occurredAt} · ${a.action} · ${a.recordNo}`) },
    ]
    return { kpis, recentJobs, customsPending, receivableRows, payableRows, alerts, recentAudit }
  })

  return {
    collections,
    hydrate,
    reload,
    list,
    get,
    getJobByNo,
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
