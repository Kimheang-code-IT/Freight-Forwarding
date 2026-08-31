import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthUser } from '~/types/auth-user'
import { findMockLoginAccount } from '~/utils/auth/mock-login'
import { AUTH_STORAGE_KEY, compactAuthUser, sessionHasPermissionData } from '~/utils/auth/session'

function restoreSessionUser(candidate: AuthUser | null | undefined): AuthUser | null {
  if (!candidate?.email) return null
  if (sessionHasPermissionData(candidate)) return candidate

  const account = findMockLoginAccount(candidate.email)
  if (!account) return candidate

  return {
    ...account.user,
    ...candidate,
    email: candidate.email,
    id: candidate.id ?? account.user.id,
  }
}

export const useAuthStore = defineStore('auth', () => {
  const cookieUser = useCookie<AuthUser | null>('auth_user', {
    default: () => null,
    path: '/',
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 30,
  })
  const storedUser = ref<AuthUser | null>(null)
  const clientHydrated = ref(false)
  const user = computed(() => storedUser.value || cookieUser.value)
  const isLoggedIn = computed(() => Boolean(user.value?.email))

  function persist(userData: AuthUser | null) {
    storedUser.value = userData
    cookieUser.value = userData ? compactAuthUser(userData) : null
    if (!import.meta.client) return
    if (userData) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
    else localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  function hydrateClient() {
    if (!import.meta.client) return

    let resolved: AuthUser | null = null
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY)
      resolved = raw ? JSON.parse(raw) as AuthUser : null
    }
    catch {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }

    if (!resolved?.email && cookieUser.value?.email) {
      resolved = cookieUser.value
    }

    resolved = restoreSessionUser(resolved)
    if (resolved?.email) {
      persist(resolved)
      useTenantStore().hydrate()
    }

    clientHydrated.value = true
  }

  function login(userData: AuthUser) {
    persist(userData)
    useTenantStore().applyUser(userData)
  }

  function clearSession() {
    persist(null)
    clientHydrated.value = true
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
    persist(next)
  }

  return {
    user,
    isLoggedIn,
    clientHydrated,
    login,
    hydrateClient,
    clearSession,
    logout,
    updateUser,
    canAccessPage,
  }
})
