import { describe, expect, it } from 'vitest'
import { MOCK_LOGIN_ACCOUNTS } from '../app/utils/auth/mock-login'
import { compactAuthUser, sessionHasPermissionData } from '../app/utils/auth/session'

describe('auth session cookie', () => {
  it('keeps compact auth cookies under the browser size limit', () => {
    for (const account of MOCK_LOGIN_ACCOUNTS) {
      const compact = compactAuthUser(account.user)
      const bytes = JSON.stringify(compact).length
      expect(bytes).toBeLessThan(2048)
      expect(compact.permissions).toBeUndefined()
    }
  })

  it('marks all-access users with ALL_PAGES only', () => {
    const admin = MOCK_LOGIN_ACCOUNTS[0]!.user
    const compact = compactAuthUser(admin)
    expect(compact.pageAccess).toEqual(['ALL_PAGES'])
    expect(sessionHasPermissionData(compact)).toBe(true)
  })

  it('treats compact standard sessions as missing permission data until hydrated', () => {
    const standard = MOCK_LOGIN_ACCOUNTS[1]!.user
    const compact = compactAuthUser(standard)
    expect(sessionHasPermissionData(compact)).toBe(false)
    expect(sessionHasPermissionData(standard)).toBe(true)
  })
})
