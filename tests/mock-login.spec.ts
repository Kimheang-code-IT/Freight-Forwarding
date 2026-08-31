import { describe, expect, it } from 'vitest'
import { authenticateMock, findMockLoginAccount } from '../app/utils/auth/mock-login'
import { getAllSystemPermissionKeys } from '../app/utils/auth/user-permissions'

describe('mock login accounts', () => {
  it('authenticates admin@gmail.com with full access', () => {
    const user = authenticateMock('admin@gmail.com', '123456')
    expect(user?.email).toBe('admin@gmail.com')
    expect(user?.pageAccess).toContain('ALL_PAGES')
    expect(user?.permissions).toEqual(getAllSystemPermissionKeys())
  })

  it('authenticates user@gmail.com without configuration, settings, or other administration pages', () => {
    const user = authenticateMock('user@gmail.com', '123456')
    expect(user?.email).toBe('user@gmail.com')

    const staffAdminView = new Set([
      'admin.users.view',
      'admin.users.export',
      'admin.roles.view',
      'admin.roles.export',
    ])
    for (const key of user?.permissions || []) {
      expect(key).not.toBe('configuration.manage')
      if (staffAdminView.has(key)) continue
      expect(key.startsWith('configuration.')).toBe(false)
      expect(key.startsWith('admin.')).toBe(false)
      expect(key.startsWith('settings.')).toBe(false)
    }

    expect(user?.permissions).toContain('dashboard.view')
    expect(user?.permissions).toContain('sales.quotations.view')
    expect(user?.permissions).toContain('operations.service_orders.view')
    expect(user?.permissions).toContain('finance.financial_documents.view')
    expect(user?.permissions).toContain('master.reference.view')
    expect(user?.permissions).toContain('reports.view')
    expect(user?.permissions).toContain('admin.users.view')
    expect(user?.permissions).toContain('admin.roles.view')
    expect(user?.permissions).not.toContain('admin.users.create')
    expect(user?.permissions).not.toContain('admin.roles.edit')
    expect(user?.sourcePermissions).toContain('user.read')
    expect(user?.sourcePermissions).toContain('role.read')
    expect(user?.sourcePermissions).not.toContain('user.manage')
    expect(user?.sourcePermissions).not.toContain('role.manage')
  })

  it('authenticates finance@gmail.com with finance-only pages', () => {
    const user = authenticateMock('finance@gmail.com', '123456')
    expect(user?.email).toBe('finance@gmail.com')
    expect(user?.role).toBe('Finance')
    expect(user?.permissions).toContain('finance.financial_documents.view')
    expect(user?.permissions).toContain('finance.accounting.view')
    expect(user?.permissions).toContain('finance.service_charges.view')
    expect(user?.permissions).not.toContain('configuration.manage')
    expect(user?.permissions).not.toContain('operations.service_orders.view')
    expect(user?.permissions).not.toContain('master.reference.view')
    expect(user?.permissions).not.toContain('sales.quotations.view')
    expect(user?.permissions).not.toContain('reports.view')
  })

  it('rejects invalid credentials', () => {
    expect(authenticateMock('user@gmail.com', 'wrong')).toBeNull()
    expect(findMockLoginAccount('unknown@example.com')).toBeNull()
  })
})
