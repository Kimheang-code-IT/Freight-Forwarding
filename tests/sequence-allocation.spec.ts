import { describe, expect, it } from 'vitest'
import { createLcsFreightSeed } from '../app/config/lcs-seed'
import {
  allocateCollectionNumber,
  allocateOfficialNumber,
  stripOfficialNumberFields,
} from '../app/utils/lcs/sequences'

function freshDb() {
  const seed = createLcsFreightSeed()
  seed.idempotency = []
  return seed
}

describe('allocateOfficialNumber', () => {
  it('allocates distinct numbers and increments sequence lastValue once per create', () => {
    const data = freshDb()
    const sequence = data.documentSequences?.find(row =>
      String(row.documentType) === 'QUOTATION'
      && String(row.status).toUpperCase() === 'ACTIVE',
    )
    const before = Number(sequence?.lastValue || 0)

    const first = allocateOfficialNumber(data, { documentType: 'QUOTATION', fallbackPrefix: 'Q' })
    const second = allocateOfficialNumber(data, { documentType: 'QUOTATION', fallbackPrefix: 'Q' })

    expect(first.number).not.toBe(second.number)
    expect(first.lastValue).toBe(before + 1)
    expect(second.lastValue).toBe(before + 2)
    const updated = data.documentSequences?.find(row => row.id === sequence?.id)
    expect(Number(updated?.lastValue)).toBe(before + 2)
  })

  it('succeeds without an official number in input and returns a formatted number', () => {
    const data = freshDb()
    const input = stripOfficialNumberFields({
      quotationNo: 'CLIENT-SUPPLIED-NO',
      customer: 'Manhattan SEZ Co., Ltd.',
      status: 'Draft',
    }, 'quotations')
    expect(input.quotationNo).toBeUndefined()

    const result = allocateCollectionNumber(data, 'quotations', input)
    expect(result?.number).toMatch(/^Q-\d{4}-\d+$/)
  })
})
