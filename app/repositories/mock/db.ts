import type { FreightRecord } from '~/config/freight-seed'
import { createLcsFreightSeed } from '~/config/lcs-seed'
import { normalizeDocumentSequenceRecord } from '~/utils/document-sequences'
import {
  normalizeComponentAssignmentRecord,
  normalizeComponentTemplateRecord,
  resolveComponentInstanceMode,
} from '~/utils/freight/component-instance-mode'
import { backfillConvertedJobOperationalFields } from '~/utils/freight/quotation-conversion'

export const LCS_FREIGHT_STORAGE_KEY = 'lcs-freight-data-v6'

const CONFIG_COLLECTIONS = ['componentGroups', 'componentTemplates', 'tradeDirectionComponents'] as const

const TRANSACTIONAL_COLLECTIONS = [
  'debitNotes',
  'jobCharges',
  'quotations',
  'users',
  'serviceComponents',
  'auditLogs',
  'journals',
  'chartOfAccounts',
  'financialAccounts',
  'postingRules',
  'actualContainers',
  'cashAccounts',
] as const

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Seed schema wins for known config rows; user-created rows are preserved. */
export function mergeConfigCollectionFromSeed(
  freshRows: FreightRecord[],
  existingRows: FreightRecord[],
) {
  const merged = freshRows.map((freshRow) => {
    const existing = existingRows.find(row => row.id === freshRow.id)
    return existing ? { ...existing, ...clone(freshRow) } : clone(freshRow)
  })
  return [
    ...merged,
    ...existingRows.filter(row => !freshRows.some(freshRow => freshRow.id === row.id)),
  ]
}

/** User/runtime data wins for transactional rows; new seed rows are added. */
export function mergeTransactionalCollectionFromSeed(
  freshRows: FreightRecord[],
  existingRows: FreightRecord[],
) {
  const merged = freshRows.map((freshRow) => {
    const existing = existingRows.find(row => row.id === freshRow.id)
    return existing ? { ...clone(freshRow), ...existing } : clone(freshRow)
  })
  return [
    ...merged,
    ...existingRows.filter(row => !freshRows.some(freshRow => freshRow.id === row.id)),
  ]
}

let memory: Record<string, FreightRecord[]> | null = null

export function createFreshLcsDb() {
  const seed = createLcsFreightSeed()
  seed.idempotency = []
  return clone(seed)
}

export function getLcsDb(): Record<string, FreightRecord[]> {
  if (memory) return memory
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(LCS_FREIGHT_STORAGE_KEY)
      if (raw) {
        memory = JSON.parse(raw) as Record<string, FreightRecord[]>
        const fresh = createLcsFreightSeed()
        for (const [collection, rows] of Object.entries(fresh)) {
          if (!Array.isArray(memory[collection])) memory[collection] = clone(rows)
        }
        for (const collection of CONFIG_COLLECTIONS) {
          memory[collection] = mergeConfigCollectionFromSeed(
            fresh[collection] || [],
            memory[collection] || [],
          )
        }
        for (const collection of TRANSACTIONAL_COLLECTIONS) {
          memory[collection] = mergeTransactionalCollectionFromSeed(
            fresh[collection] || [],
            memory[collection] || [],
          )
        }
        memory.documentSequences = (memory.documentSequences || []).map(normalizeDocumentSequenceRecord)
        memory.componentTemplates = (memory.componentTemplates || []).map(normalizeComponentTemplateRecord)
        memory.tradeDirectionComponents = (memory.tradeDirectionComponents || []).map(normalizeComponentAssignmentRecord)
        const componentTemplates = memory.componentTemplates || []
        const componentAssignments = memory.tradeDirectionComponents || []
        memory.serviceComponents = (memory.serviceComponents || []).map((component) => {
          const template = componentTemplates.find(row =>
            String(row.code || row.name) === String(component.templateCode),
          )
          const assignment = componentAssignments.find(row =>
            String(row.componentTemplate) === String(template?.name || component.templateCode),
          )
          return {
            ...component,
            resolvedInstanceMode: resolveComponentInstanceMode(assignment, template),
          }
        })
        const quotations = memory.quotations || []
        memory.jobs = (memory.jobs || []).map((job) => {
          const quotation = quotations.find(row =>
            String(row.quotationNo || '') === String(job.quotationNo || ''),
          )
          return quotation ? backfillConvertedJobOperationalFields(job, quotation) as FreightRecord : job
        })
        if (!memory.idempotency) memory.idempotency = []
        return memory
      }
    }
    catch {
      // Fall through to seed.
    }
  }
  memory = createFreshLcsDb()
  persistLcsDb()
  return memory
}

export function setLcsDb(next: Record<string, FreightRecord[]>) {
  memory = next
  persistLcsDb()
}

export function persistLcsDb() {
  if (!import.meta.client || !memory) return
  localStorage.setItem(LCS_FREIGHT_STORAGE_KEY, JSON.stringify(memory))
}

export function resetLcsDb() {
  memory = createFreshLcsDb()
  persistLcsDb()
  return memory
}

export function delay(ms = 40) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
