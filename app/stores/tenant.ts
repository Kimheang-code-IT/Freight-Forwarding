import { defineStore } from 'pinia'
import { LCS_BRANCHES, LCS_ORGANIZATIONS } from '~/config/lcs-tenant'
import type { AuthUser } from '~/types/auth-user'
import type { BranchSelection } from '~/types/lcs/session'
import { canSelectAllBranches } from '~/utils/lcs/permissions'

const ORG_KEY = 'lcs-active-org'
const BRANCH_KEY = 'lcs-active-branch'

export const useTenantStore = defineStore('tenant', () => {
  const organizationId = useState('lcs-org-id', () => 1)
  const branchId = useState<BranchSelection>('lcs-branch-id', () => 'all')

  const auth = useAuthStore()

  const assignedBranches = computed(() => {
    const user = auth.user
    const orgId = organizationId.value
    const allowed = new Set(user?.assignedBranchIds || [])
    return LCS_BRANCHES.filter(branch =>
      branch.organization_id === orgId && (allowed.size === 0 || allowed.has(branch.id)),
    )
  })

  const organizations = computed(() => {
    const user = auth.user
    if (!user?.organizationId) return [...LCS_ORGANIZATIONS]
    return LCS_ORGANIZATIONS.filter(org => org.id === user.organizationId)
  })

  const activeOrganization = computed(() =>
    organizations.value.find(org => org.id === organizationId.value) || organizations.value[0] || null,
  )

  const activeBranch = computed(() => {
    if (branchId.value === 'all') return null
    return assignedBranches.value.find(branch => branch.id === branchId.value) || null
  })

  const allowAllBranches = computed(() => canSelectAllBranches(auth.user))

  function persist() {
    if (!import.meta.client) return
    localStorage.setItem(ORG_KEY, String(organizationId.value))
    localStorage.setItem(BRANCH_KEY, String(branchId.value))
  }

  function applyUser(user: AuthUser | null) {
    if (!user) return
    organizationId.value = user.organizationId || organizationId.value
    const allowed = user.assignedBranchIds || []
    if (user.permissionScope === 'ORGANIZATION') {
      branchId.value = 'all'
    }
    else if (user.branchId && allowed.includes(user.branchId)) {
      branchId.value = user.branchId
    }
    else if (allowed[0]) {
      branchId.value = allowed[0]
    }
    persist()
  }

  function setOrganization(id: number) {
    if (!organizations.value.some(org => org.id === id)) return
    organizationId.value = id
    if (branchId.value !== 'all' && !assignedBranches.value.some(branch => branch.id === branchId.value)) {
      branchId.value = allowAllBranches.value ? 'all' : (assignedBranches.value[0]?.id || 'all')
    }
    persist()
  }

  function setBranch(id: BranchSelection) {
    if (id === 'all') {
      if (!allowAllBranches.value) return
      branchId.value = 'all'
      persist()
      return
    }
    if (!assignedBranches.value.some(branch => branch.id === id)) return
    branchId.value = id
    persist()
  }

  function hydrate() {
    const user = auth.user
    if (!user) return
    if (import.meta.client) {
      const savedOrg = Number(localStorage.getItem(ORG_KEY) || user.organizationId || 1)
      const savedBranch = localStorage.getItem(BRANCH_KEY)
      organizationId.value = user.organizationId || savedOrg
      if (savedBranch === 'all' && canSelectAllBranches(user)) {
        branchId.value = 'all'
      }
      else if (savedBranch && user.assignedBranchIds?.includes(Number(savedBranch))) {
        branchId.value = Number(savedBranch)
      }
      else {
        applyUser(user)
      }
    }
    else {
      applyUser(user)
    }
  }

  return {
    organizationId,
    branchId,
    organizations,
    assignedBranches,
    activeOrganization,
    activeBranch,
    allowAllBranches,
    applyUser,
    setOrganization,
    setBranch,
    hydrate,
  }
})
