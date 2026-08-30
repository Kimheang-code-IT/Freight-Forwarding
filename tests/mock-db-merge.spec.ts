import { describe, expect, it } from 'vitest'
import type { FreightRecord } from '../app/config/freight-seed'
import {
  mergeConfigCollectionFromSeed,
  mergeTransactionalCollectionFromSeed,
} from '../app/repositories/mock/db'

describe('mock db seed merge', () => {
  it('lets fresh seed win for configuration rows', () => {
    const fresh = [{ id: 'tpl-003', instanceMode: 'REPEATABLE', repeatable: 'Yes' }] as FreightRecord[]
    const existing = [{ id: 'tpl-003', instanceMode: 'SINGLE', repeatable: 'No' }] as FreightRecord[]
    const merged = mergeConfigCollectionFromSeed(fresh, existing)
    expect(merged[0]?.instanceMode).toBe('REPEATABLE')
    expect(merged[0]?.repeatable).toBe('Yes')
  })

  it('keeps user/runtime data for transactional rows', () => {
    const fresh = [{ id: 'cmp-1', status: 'PENDING', valueText: 'seed' }] as FreightRecord[]
    const existing = [{ id: 'cmp-1', status: 'COMPLETED', valueText: 'saved' }] as FreightRecord[]
    const merged = mergeTransactionalCollectionFromSeed(fresh, existing)
    expect(merged[0]?.status).toBe('COMPLETED')
    expect(merged[0]?.valueText).toBe('saved')
  })

  it('adds new seed rows without dropping user-created rows', () => {
    const fresh = [{ id: 'cmp-1' }, { id: 'cmp-2' }] as FreightRecord[]
    const existing = [{ id: 'cmp-1' }, { id: 'cmp-custom' }] as FreightRecord[]
    const merged = mergeTransactionalCollectionFromSeed(fresh, existing)
    expect(merged.map(row => row.id)).toEqual(['cmp-1', 'cmp-2', 'cmp-custom'])
  })
})
