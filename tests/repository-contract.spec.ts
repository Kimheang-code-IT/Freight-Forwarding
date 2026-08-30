import { describe, expect, it } from 'vitest'
import { createLcsFreightSeed } from '../app/config/lcs-seed'
import {
  allocateCollectionNumber,
  stripOfficialNumberFields,
} from '../app/utils/lcs/sequences'
import type { LcsCollections } from '../app/utils/lcs/commands'
import { stampTenant } from '../app/utils/lcs/scope'
import type { LcsSession } from '../app/types/lcs/session'
import { SOURCE_PERMISSIONS } from '../app/types/lcs/domain'

function adminSession(): LcsSession {
  return {
    userId: 1,
    userName: 'System Administrator',
    organizationId: 1,
    branchId: 'all',
    assignedBranchIds: [1, 2],
    permissionScope: 'ORGANIZATION',
    sourcePermissions: [...SOURCE_PERMISSIONS],
  }
}

function createQuotationRecord(db: LcsCollections, input: Record<string, unknown>) {
  const session = adminSession()
  const stripped = stripOfficialNumberFields(input, 'quotations')
  const allocation = allocateCollectionNumber(db, 'quotations', stripped)!
  const record = stampTenant({
    ...stripped,
    quotationNo: allocation.number,
    status: 'Draft',
    currency: 'USD',
    id: `quo-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }, session)
  db.quotations = [record, ...(db.quotations || [])]
  return record
}

describe('mock repository create contract', () => {
  it('creates quotations without a client-supplied official number', () => {
    const db = createLcsFreightSeed()
    db.idempotency = []
    const created = createQuotationRecord(db, {
      customer: 'Royal Group Manufacturing',
      direction: 'Import',
      currency: 'USD',
    })
    expect(String(created.quotationNo || '')).toMatch(/^Q-\d{4}-\d+$/)
    expect(created.customer).toBe('Royal Group Manufacturing')
  })

  it('returns distinct official numbers for back-to-back creates', () => {
    const db = createLcsFreightSeed()
    db.idempotency = []
    const first = createQuotationRecord(db, { customer: 'A', direction: 'Import' })
    const second = createQuotationRecord(db, { customer: 'B', direction: 'Export' })
    expect(first.quotationNo).not.toBe(second.quotationNo)
  })
})
