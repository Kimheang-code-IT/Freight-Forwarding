import type { AuthUser } from '~/types/auth-user'
import type { SourcePermission } from '~/types/lcs/domain'
import { SOURCE_PERMISSIONS } from '~/types/lcs/domain'
import { getAllSystemPermissionKeys } from '~/utils/auth/user-permissions'
import {
  BRANCH_BAVET_ID,
  BRANCH_DEMO_ID,
  BRANCH_PP_ID,
  DEMO_ORG_ID,
  LCS_ORG_ID,
} from '~/config/lcs-tenant'

export type MockLoginAccount = {
  email: string
  password: string
  user: AuthUser
}

const ALL_SOURCE = [...SOURCE_PERMISSIONS] as SourcePermission[]

const OPS_SOURCE: SourcePermission[] = [
  'quotation.read',
  'quotation.create',
  'quotation.update_draft',
  'quotation.send',
  'service_order.read',
  'service_order.create',
  'service_order.update',
  'service_order.complete',
  'service_charge.create',
  'service_charge.issue',
  'attachment.read',
  'attachment.upload',
  'report.read',
]

const FINANCE_SOURCE: SourcePermission[] = [
  'quotation.read',
  'service_order.read',
  'service_charge.create',
  'service_charge.issue',
  'service_charge.convert_to_invoice',
  'financial_document.read',
  'financial_document.create',
  'financial_document.update_draft',
  'financial_document.post',
  'financial_document.reverse',
  'financial_document.allocate',
  'journal_entry.read',
  'journal_entry.create',
  'journal_entry.post',
  'accounting_period.read',
  'attachment.read',
  'attachment.upload',
  'report.read',
]

const AUDITOR_SOURCE: SourcePermission[] = [
  'quotation.read',
  'service_order.read',
  'financial_document.read',
  'journal_entry.read',
  'accounting_period.read',
  'attachment.read',
  'audit_log.read',
  'report.read',
]

const OPS_PAGES = [
  'dashboard.view',
  'sales.quotations.view',
  'sales.quotations.create',
  'sales.quotations.edit',
  'operations.service_orders.view',
  'finance.service_charges.view',
  'master.reference.view',
]

const FINANCE_PAGES = [
  'dashboard.view',
  'operations.service_orders.view',
  'finance.financial_documents.view',
  'finance.service_charges.view',
  'reports.view',
  'master.reference.view',
  'finance.accounting.view',
]

const AUDITOR_PAGES = [
  'dashboard.view',
  'sales.quotations.view',
  'operations.service_orders.view',
  'finance.financial_documents.view',
  'admin.audit_logs.view',
  'reports.view',
  'master.reference.view',
  'finance.accounting.view',
]

function avatar(name: string, bg: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff`
}

/** Frontend-only demo accounts. Replace with real API auth later. */
export const MOCK_LOGIN_ACCOUNTS: MockLoginAccount[] = [
  {
    email: 'admin@gmail.com',
    password: '123456',
    user: {
      id: 1,
      name: 'System Administrator',
      email: 'admin@gmail.com',
      role: 'SuperAdmin',
      avatar: avatar('System Administrator', 'e8472a'),
      pageAccess: ['ALL_PAGES'],
      permissions: getAllSystemPermissionKeys(),
      organizationId: LCS_ORG_ID,
      organizationCode: 'LCS',
      organizationName: 'LCS Freight',
      branchId: BRANCH_BAVET_ID,
      branchName: 'Bavet',
      assignedBranchIds: [BRANCH_BAVET_ID, BRANCH_PP_ID],
      permissionScope: 'ORGANIZATION',
      sourcePermissions: ALL_SOURCE,
    },
  },
  {
    email: 'admin@lcs.local',
    password: '123456',
    user: {
      id: 2,
      name: 'LCS Admin',
      email: 'admin@lcs.local',
      role: 'Admin',
      avatar: avatar('LCS Admin', '3a539f'),
      pageAccess: ['ALL_PAGES'],
      permissions: getAllSystemPermissionKeys(),
      organizationId: LCS_ORG_ID,
      organizationCode: 'LCS',
      organizationName: 'LCS Freight',
      branchId: BRANCH_PP_ID,
      branchName: 'Phnom Penh',
      assignedBranchIds: [BRANCH_BAVET_ID, BRANCH_PP_ID],
      permissionScope: 'ORGANIZATION',
      sourcePermissions: ALL_SOURCE,
    },
  },
  {
    email: 'ops.bavet@lcs.local',
    password: '123456',
    user: {
      id: 3,
      name: 'Sokha Vann',
      email: 'ops.bavet@lcs.local',
      role: 'Operations',
      avatar: avatar('Sokha Vann', '0f766e'),
      pageAccess: OPS_PAGES,
      permissions: OPS_PAGES,
      organizationId: LCS_ORG_ID,
      organizationCode: 'LCS',
      organizationName: 'LCS Freight',
      branchId: BRANCH_BAVET_ID,
      branchName: 'Bavet',
      assignedBranchIds: [BRANCH_BAVET_ID],
      permissionScope: 'BRANCH',
      sourcePermissions: OPS_SOURCE,
    },
  },
  {
    email: 'finance@lcs.local',
    password: '123456',
    user: {
      id: 4,
      name: 'Dara Chan',
      email: 'finance@lcs.local',
      role: 'Finance',
      avatar: avatar('Dara Chan', '1d4ed8'),
      pageAccess: FINANCE_PAGES,
      permissions: FINANCE_PAGES,
      organizationId: LCS_ORG_ID,
      organizationCode: 'LCS',
      organizationName: 'LCS Freight',
      branchId: BRANCH_PP_ID,
      branchName: 'Phnom Penh',
      assignedBranchIds: [BRANCH_BAVET_ID, BRANCH_PP_ID],
      permissionScope: 'ORGANIZATION',
      sourcePermissions: FINANCE_SOURCE,
    },
  },
  {
    email: 'auditor@lcs.local',
    password: '123456',
    user: {
      id: 5,
      name: 'Audit Reviewer',
      email: 'auditor@lcs.local',
      role: 'Auditor',
      avatar: avatar('Audit Reviewer', '57534e'),
      pageAccess: AUDITOR_PAGES,
      permissions: AUDITOR_PAGES,
      organizationId: LCS_ORG_ID,
      organizationCode: 'LCS',
      organizationName: 'LCS Freight',
      branchId: BRANCH_PP_ID,
      branchName: 'Phnom Penh',
      assignedBranchIds: [BRANCH_BAVET_ID, BRANCH_PP_ID],
      permissionScope: 'ORGANIZATION',
      sourcePermissions: AUDITOR_SOURCE,
    },
  },
  {
    email: 'demo@other.local',
    password: '123456',
    user: {
      id: 6,
      name: 'Demo Operator',
      email: 'demo@other.local',
      role: 'Operations',
      avatar: avatar('Demo Operator', '7c3aed'),
      pageAccess: OPS_PAGES,
      permissions: OPS_PAGES,
      organizationId: DEMO_ORG_ID,
      organizationCode: 'DEMO',
      organizationName: 'Demo Logistics',
      branchId: BRANCH_DEMO_ID,
      branchName: 'Demo HQ',
      assignedBranchIds: [BRANCH_DEMO_ID],
      permissionScope: 'BRANCH',
      sourcePermissions: OPS_SOURCE,
    },
  },
]

export function findMockLoginAccount(email: string) {
  const normalized = email.trim().toLowerCase()
  return MOCK_LOGIN_ACCOUNTS.find(a => a.email.toLowerCase() === normalized) ?? null
}

export function authenticateMock(email: string, password: string): AuthUser | null {
  const account = findMockLoginAccount(email)
  if (!account || account.password !== password) return null
  return { ...account.user, sourcePermissions: [...(account.user.sourcePermissions || [])] }
}
