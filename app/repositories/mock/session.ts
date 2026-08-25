import { sessionFromUser } from '~/utils/lcs/session-from-user'
import type { LcsSession } from '~/types/lcs/session'
import type { SourcePermission } from '~/types/lcs/domain'

export { sessionFromUser }

export function currentLcsSession(): LcsSession {
  const auth = useAuthStore()
  const tenant = useTenantStore()
  return sessionFromUser(auth.user, tenant.organizationId, tenant.branchId)
}

export function hasSessionPermission(code: SourcePermission) {
  return currentLcsSession().sourcePermissions.includes(code)
}
