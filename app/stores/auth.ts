import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { AuthUser } from '~/types/auth-user'

export const useAuthStore = defineStore('auth', () => {
  const cookieOptions = {
    default: () => null,
    path: '/',
    sameSite: 'strict' as const,
    secure: import.meta.env.PROD,
  }
  const user = useCookie<AuthUser | null>('auth_user', cookieOptions)
  const isLoggedIn = computed(() => Boolean(user.value))

  function login(userData: AuthUser) {
    user.value = userData
    useTenantStore().applyUser(userData)
  }

  function clearSession() {
    user.value = null
    if (import.meta.client) {
      localStorage.removeItem('lcs-active-org')
      localStorage.removeItem('lcs-active-branch')
    }
  }

  async function logout() {
    clearSession()
    await navigateTo('/auth/login')
  }

  /**
   * Frontend-only visibility check. Backend must still enforce authorization.
   * `permissions` is authoritative when present. `pageAccess` remains a
   * backwards-compatible fallback for older sessions.
   */
  function canAccessPage(pageId: string): boolean {
    const currentUser = user.value
    if (!currentUser) return false
    if (currentUser.role === 'SuperAdmin') return true
    if (currentUser.pageAccess?.includes('ALL_PAGES')) return true

    if (Array.isArray(currentUser.permissions)) {
      if (currentUser.permissions.includes('ALL_PAGES')) return true
      if (currentUser.permissions.includes(pageId)) return true
      if (pageId === 'configuration.manage' && currentUser.permissions.includes('configuration.configure')) return true
      return false
    }

    const access = currentUser.pageAccess
    if (!access?.length) return true
    return access.includes(pageId)
  }

  function updateUser(partial: Partial<AuthUser>) {
    if (!user.value) return
    const next = { ...user.value, ...partial }
    if ('avatar' in partial && partial.avatar == null) {
      delete next.avatar
    }
    user.value = next
  }

  return {
    user,
    isLoggedIn,
    login,
    clearSession,
    logout,
    updateUser,
    canAccessPage,
  }
})
