import { describe, expect, it } from 'vitest'
import { createLcsFreightSeed } from '../app/config/lcs-seed'
import type { FreightRecord } from '../app/config/freight-seed'
import { resolveDocumentTraceability } from '../app/utils/freight/traceability'

function lookups() {
  const seed = createLcsFreightSeed()
  return {
    jobs: seed.jobs,
    quotations: seed.quotations,
    charges: seed.jobCharges,
    documents: seed.debitNotes,
    journals: seed.journals,
  }
}

describe('resolveDocumentTraceability', () => {
  it('chains quotation, job, invoice, and posted journal for an issued service charge', () => {
    const ctx = lookups()
    const charge = ctx.charges.find(row => row.id === 'jc-001')
    expect(charge).toBeTruthy()
    const trace = resolveDocumentTraceability(charge!, 'charge', ctx)
    expect(trace.invoiceNo).toBe('DN-2608-041')
    expect(trace.journalNo).toBe('JE-2026-0041')
    expect(trace.links.map(row => row.sourceTypeKey)).toEqual([
      'quotation',
      'serviceOrder',
      'financeInvoice',
      'postedJournal',
    ])
    expect(trace.links.map(row => row.sourceNo)).toEqual([
      'QT-2026-0812',
      'LCS-IM-260821',
      'DN-2608-041',
      'JE-2026-0041',
    ])
  })

  it('does not invent links for a new service charge', () => {
    const ctx = lookups()
    const trace = resolveDocumentTraceability({ id: '' } as FreightRecord, 'charge', ctx)
    expect(trace.links).toEqual([])
    expect(trace.invoiceNo).toBe('')
    expect(trace.journalNo).toBe('')
  })

  it('points a finance invoice back to its source service charge', () => {
    const ctx = lookups()
    const invoice = ctx.documents.find(row => row.id === 'dn-001')
    expect(invoice).toBeTruthy()
    const trace = resolveDocumentTraceability(invoice!, 'finance', ctx)
    expect(trace.sourceChargeNo).toMatch(/^SC-/)
    expect(trace.links.map(row => row.sourceTypeKey)).toContain('serviceCharge')
    expect(trace.links.map(row => row.sourceTypeKey)).not.toContain('financeInvoice')
  })
})
