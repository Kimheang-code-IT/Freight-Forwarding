import { useAccessAlert } from '~/composables/common/useAccessAlert'

const PERMITTED_LANDING_ROUTES = [
  ['/', 'dashboard.view'],
  ['/service-orders', 'operations.service_orders.view'],
  ['/quotations', 'sales.quotations.view'],
  ['/finance/documents', 'finance.financial_documents.view'],
  ['/reports', 'reports.view'],
  ['/administration/users', 'admin.users.view'],
  ['/configuration/system-settings', 'settings.app_config.view'],
] as const

export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuthStore()
  const { showPermissionDenied } = useAccessAlert()

  const publicPaths = [
    '/auth/login',
    '/auth/forget-password',
    '/auth/verify-code',
    '/auth/reset-password',
  ]
  const isPublicPage = publicPaths.includes(to.path)

  if (!auth.isLoggedIn && !isPublicPage) {
    return navigateTo('/auth/login')
  }

  if (auth.isLoggedIn && isPublicPage) {
    return navigateTo('/')
  }

  const permission = typeof to.meta.permission === 'string' ? to.meta.permission : ''
  if (auth.isLoggedIn && permission && !auth.canAccessPage(permission)) {
    showPermissionDenied({
      requestedPath: to.fullPath,
      permission,
    })

    // Keep the current authorized page when denial happens during navigation.
    if (from.matched.length && from.path !== to.path) return abortNavigation()

    // A direct URL needs an authorized page underneath the global dialog.
    const landing = PERMITTED_LANDING_ROUTES.find(([, required]) => auth.canAccessPage(required))
    if (landing) return navigateTo(landing[0], { replace: true })

    // An account with no usable page returns to sign-in without creating a denial page.
    auth.clearSession()
    return navigateTo('/auth/login', { replace: true })
  }
})
