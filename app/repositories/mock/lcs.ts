import type { FreightRecord } from '~/config/freight-seed'
import type { LcsPaged } from '~/types/lcs/domain'
import type { SourcePermission } from '~/types/lcs/domain'
import type {
  AttachmentRepository,
  AuditRepository,
  ComponentRepository,
  FinanceRepository,
  JobRepository,
  LcsListQuery,
  OrganizationRepository,
  QuotationRepository,
  ServiceChargeRepository,
  UiSchemaRepository,
} from '~/repositories/contracts/lcs'
import { LCS_BRANCHES, LCS_ORGANIZATIONS } from '~/config/lcs-tenant'
import { delay, getLcsDb, persistLcsDb } from '~/repositories/mock/db'
import { currentLcsSession } from '~/repositories/mock/session'
import {
  acceptQuotationRevision,
  addActualContainer,
  allocatePayment,
  assertCanSave,
  closeAccountingPeriod,
  completeServiceComponent,
  convertQuotationRevision,
  createFinanceInvoiceFromCharge,
  createQuotationRevision,
  ensureServiceComponent,
  removeServiceComponent,
  saveServiceComponentValues,
  issueServiceCharge,
  postFinancialDocument,
  reverseFinancialDocument,
  sendQuotationRevision,
  submitQuotationRevision,
  type LcsCollections,
} from '~/utils/lcs/commands'
import { assertRecordAccess, filterScopedRecords, stampTenant } from '~/utils/lcs/scope'
import { domainError } from '~/utils/lcs/errors'
import {
  allocateCollectionNumber,
  COLLECTION_SEQUENCE_CONFIG,
  stripOfficialNumberFields,
} from '~/utils/lcs/sequences'

function newRecordId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

const CREATE_ID_PREFIX: Record<string, string> = {
  quotations: 'quo',
  jobCharges: 'chg',
  debitNotes: 'dn',
  journals: 'je',
}

function insertCreatedRecord(
  db: LcsCollections,
  session: ReturnType<typeof currentLcsSession>,
  collection: keyof LcsCollections,
  input: Record<string, unknown>,
  permission: SourcePermission,
  defaults: Record<string, unknown> = {},
): FreightRecord {
  assertCanSave(db, session, collection as string, { id: '' } as FreightRecord, permission)
  const stripped = stripOfficialNumberFields(input, collection as string)
  const allocation = allocateCollectionNumber(db, collection as string, stripped)
  const config = COLLECTION_SEQUENCE_CONFIG[collection as string]
  const stamped = stampTenant({
    ...stripped,
    ...(allocation && config ? { [config.numberField]: allocation.number } : {}),
    ...defaults,
    id: newRecordId(CREATE_ID_PREFIX[collection as string] || 'rec'),
    createdAt: new Date().toISOString(),
  } as FreightRecord, session)
  const list = [...((db[collection] as FreightRecord[]) || [])]
  list.unshift(stamped)
  db[collection] = list as typeof db[typeof collection]
  return stamped
}

function pageRows(items: FreightRecord[], query: LcsListQuery = {}): LcsPaged<FreightRecord> {
  const page = Math.max(1, query.page || 1)
  const pageSize = Math.min(200, Math.max(1, query.page_size || 50))
  const q = String(query.q || '').trim().toLowerCase()
  let rows = items
  if (q) {
    rows = rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(q)))
  }
  if (query.status) {
    rows = rows.filter(row => String(row.status || '') === query.status)
  }
  const total = rows.length
  const start = (page - 1) * pageSize
  return {
    items: rows.slice(start, start + pageSize),
    meta: { page, page_size: pageSize, total },
  }
}

function scoped(collection: string) {
  const session = currentLcsSession()
  return filterScopedRecords(getLcsDb()[collection] || [], session)
}

function getScoped(collection: string, id: string) {
  const session = currentLcsSession()
  const record = (getLcsDb()[collection] || []).find(row => row.id === id) || null
  assertRecordAccess(record, session)
  return record!
}

async function run<T>(fn: (db: LcsCollections) => T) {
  await delay()
  const db = getLcsDb()
  const result = fn(db)
  persistLcsDb()
  return result
}

export function createMockQuotationRepository(): QuotationRepository {
  return {
    list: async query => pageRows(scoped('quotations'), query),
    get: async id => getScoped('quotations', id),
    create: async (input) => {
      const session = currentLcsSession()
      return run(db => insertCreatedRecord(db, session, 'quotations', input, 'quotation.create', {
        status: input.status || 'Draft',
        currency: input.currency || 'USD',
      }))
    },
    saveDraft: async (record) => {
      const session = currentLcsSession()
      return run((db) => {
        assertCanSave(db, session, 'quotations', record, record.id ? 'quotation.update_draft' : 'quotation.create')
        const stamped = stampTenant({ ...record, status: record.status || 'Draft' }, session)
        const list = [...(db.quotations || [])]
        const index = list.findIndex(row => row.id === stamped.id)
        if (index >= 0) list[index] = stamped
        else list.unshift(stamped)
        db.quotations = list
        return stamped
      })
    },
    send: (revisionId, key) => run(db => sendQuotationRevision(db, currentLcsSession(), revisionId, key)),
    accept: (revisionId, key) => run(db => acceptQuotationRevision(db, currentLcsSession(), revisionId, key)),
    createRevision: quotationId => run(db => createQuotationRevision(db, currentLcsSession(), quotationId)),
    submit: (revisionId, key) => run(db => submitQuotationRevision(db, currentLcsSession(), revisionId, key)),
    convert: (revisionId, key) => run(db => convertQuotationRevision(db, currentLcsSession(), revisionId, key)),
  }
}

export function createMockJobRepository(): JobRepository {
  return {
    list: async query => pageRows(scoped('jobs'), query),
    get: async id => getScoped('jobs', id),
    save: async (record) => {
      const session = currentLcsSession()
      return run((db) => {
        assertCanSave(db, session, 'jobs', record, 'service_order.update')
        const stamped = stampTenant(record, session)
        const list = [...(db.jobs || [])]
        const index = list.findIndex(row => row.id === stamped.id)
        if (index >= 0) list[index] = stamped
        else list.unshift(stamped)
        db.jobs = list
        return stamped
      })
    },
    addActualContainer: (serviceOrderId, payload) =>
      run(db => addActualContainer(db, currentLcsSession(), serviceOrderId, payload)),
  }
}

export function createMockComponentRepository(): ComponentRepository {
  return {
    listForJob: async (jobNo) => {
      await delay()
      return scoped('serviceComponents').filter(row => String(row.jobNo || '') === jobNo)
    },
    complete: (componentId, key) =>
      run(db => completeServiceComponent(db, currentLcsSession(), componentId, key)),
    saveValues: (componentId, values) =>
      run(db => saveServiceComponentValues(db, currentLcsSession(), componentId, values)),
    remove: (componentId, key) =>
      run(db => removeServiceComponent(db, currentLcsSession(), componentId, key)),
    ensureForJob: async (jobNo, payload) =>
      run(db => ensureServiceComponent(db, currentLcsSession(), { ...payload, jobNo })),
  }
}

export function createMockServiceChargeRepository(): ServiceChargeRepository {
  return {
    list: async query => pageRows(scoped('jobCharges'), query),
    get: async id => getScoped('jobCharges', id),
    create: async (input) => {
      const session = currentLcsSession()
      return run(db => insertCreatedRecord(db, session, 'jobCharges', input, 'service_charge.create', {
        status: input.status || 'Draft',
        journalId: '',
        posted: false,
      }))
    },
    saveDraft: async (record) => {
      const session = currentLcsSession()
      return run((db) => {
        assertCanSave(db, session, 'jobCharges', record, 'service_charge.create')
        const stamped = stampTenant({ ...record, status: record.status || 'Draft', journalId: '', posted: false }, session)
        const list = [...(db.jobCharges || [])]
        const index = list.findIndex(row => row.id === stamped.id)
        if (index >= 0) list[index] = stamped
        else list.unshift(stamped)
        db.jobCharges = list
        return stamped
      })
    },
    issue: (chargeId, key) => run(db => issueServiceCharge(db, currentLcsSession(), chargeId, key)),
    createFinanceInvoice: (chargeId, key) =>
      run(db => createFinanceInvoiceFromCharge(db, currentLcsSession(), chargeId, key)),
  }
}

export function createMockFinanceRepository(): FinanceRepository {
  return {
    listDocuments: async query => pageRows(scoped('debitNotes'), query),
    getDocument: async id => getScoped('debitNotes', id),
    createDocument: async (input) => {
      const session = currentLcsSession()
      return run(db => insertCreatedRecord(db, session, 'debitNotes', input, 'financial_document.create', {
        status: input.status || 'Draft',
      }))
    },
    saveDraft: async (record) => {
      const session = currentLcsSession()
      return run((db) => {
        assertCanSave(db, session, 'debitNotes', record, record.id ? 'financial_document.update_draft' : 'financial_document.create')
        const stamped = stampTenant({ ...record, status: record.status || 'Draft' }, session)
        const list = [...(db.debitNotes || [])]
        const index = list.findIndex(row => row.id === stamped.id)
        if (index >= 0) list[index] = stamped
        else list.unshift(stamped)
        db.debitNotes = list
        return stamped
      })
    },
    post: (documentId, key) => run(db => postFinancialDocument(db, currentLcsSession(), documentId, key)),
    reverse: (documentId, reason, key) =>
      run(db => reverseFinancialDocument(db, currentLcsSession(), documentId, reason, key)),
    allocate: (paymentId, targetDocumentId, amount, key) =>
      run(db => allocatePayment(db, currentLcsSession(), paymentId, targetDocumentId, amount, key)),
    listJournals: async query => pageRows(scoped('journals'), query),
    getJournal: async id => getScoped('journals', id),
    createJournal: async (input) => {
      const session = currentLcsSession()
      return run(db => insertCreatedRecord(db, session, 'journals', input, 'financial_document.create', {
        status: input.status || 'DRAFT',
      }))
    },
    saveJournal: async (record) => {
      const session = currentLcsSession()
      return run((db) => {
        assertCanSave(db, session, 'journals', record, 'financial_document.update_draft')
        const stamped = stampTenant({ ...record, status: record.status || 'DRAFT' }, session)
        const list = [...(db.journals || [])]
        const index = list.findIndex(row => row.id === stamped.id)
        if (index >= 0) list[index] = stamped
        else list.unshift(stamped)
        db.journals = list
        return stamped
      })
    },
    listPeriods: async () => scoped('accountingPeriods'),
    closePeriod: (periodId, key) => run(db => closeAccountingPeriod(db, currentLcsSession(), periodId, key)),
  }
}

export function createMockOrganizationRepository(): OrganizationRepository {
  return {
    listOrganizations: async () => {
      await delay()
      const session = currentLcsSession()
      return LCS_ORGANIZATIONS
        .filter(org => org.id === session.organizationId)
        .map(org => ({ id: org.id, display_name: org.display_name, organization_code: org.organization_code }))
    },
    listBranches: async (organizationId) => {
      await delay()
      const session = currentLcsSession()
      if (organizationId !== session.organizationId) {
        throw domainError('ACCESS_DENIED', 'You do not have access to this record.', { statusCode: 403 })
      }
      return LCS_BRANCHES
        .filter(branch => branch.organization_id === organizationId && session.assignedBranchIds.includes(branch.id))
        .map(branch => ({
          id: branch.id,
          name: branch.name,
          organization_id: branch.organization_id,
          branch_code: branch.branch_code,
        }))
    },
  }
}

export function createMockAuditRepository(): AuditRepository {
  return {
    list: async query => pageRows(scoped('auditLogs'), query),
  }
}

export function createMockAttachmentRepository(): AttachmentRepository {
  return {
    listForRecord: async (module, recordNo) => {
      await delay()
      return scoped('documents').filter(row =>
        String(row.jobNo || row.recordNo || '') === recordNo || String(row.documentType || '') === module,
      )
    },
    presign: async (fileName) => {
      await delay()
      return { upload_url: `/mock-upload/${encodeURIComponent(fileName)}`, file_name: fileName }
    },
  }
}

export function createMockUiSchemaRepository(): UiSchemaRepository {
  return {
    getPageSchema: async (page) => {
      await delay()
      return scoped('uiSchemas').find(row => String(row.page) === page) || null
    },
  }
}
