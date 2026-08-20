import type { NavigationMenuItem } from '@nuxt/ui'

const SIDEBAR_COLLAPSED_KEY = 'lcs-freight:sidebar:collapsed'
const SIDEBAR_AUTO_MQ = '(max-width: 1023px)'

/** Single source of truth for the LCS Freight Forwarding navigation. */
export function useMenu() {
  const { t } = useI18n()
  const open = useState('sidebar-open', () => false)
  const collapsed = useState('sidebar-collapsed', () => false)
  const manualCollapsed = useState<boolean | null>('sidebar-collapsed-manual', () => null)
  const isNarrow = useMediaQuery(SIDEBAR_AUTO_MQ)
  const hydrated = useState('sidebar-collapsed-hydrated', () => false)

  function close() { open.value = false }
  function applyAutoCollapse(narrow: boolean) { collapsed.value = manualCollapsed.value == null ? narrow : manualCollapsed.value }
  function setCollapsed(value: boolean) {
    collapsed.value = value
    manualCollapsed.value = value
    if (import.meta.client) localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0')
  }

  if (import.meta.client && !hydrated.value) {
    hydrated.value = true
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved === '1' || saved === '0') {
      manualCollapsed.value = saved === '1'
      collapsed.value = manualCollapsed.value
    }
    else applyAutoCollapse(isNarrow.value)
    watch(isNarrow, applyAutoCollapse)
  }

  const pageLink = (label: string, to: string): NavigationMenuItem => ({ label, to, exact: true, class: 'text-sm gap-2', onSelect: close })

  const group = (label: string, icon: string, children: NavigationMenuItem[], defaultOpen = false): NavigationMenuItem => ({
    label,
    icon,
    type: 'trigger',
    defaultOpen,
    class: 'mt-1 text-sm gap-2',
    children,
  })

  const links = computed<NavigationMenuItem[][]>(() => [[
    { label: t('freight.nav.dashboard'), icon: 'i-lucide-layout-dashboard', to: '/', exact: true, class: 'text-sm gap-2', onSelect: close },
    group(t('freight.nav.sales'), 'i-lucide-briefcase-business', [
      pageLink(t('freight.pages.companies'), '/sales/companies'),
      pageLink(t('freight.pages.quotations'), '/sales/quotations'),
    ], true),
    group(t('freight.nav.operations'), 'i-lucide-container', [
      pageLink(t('freight.pages.jobs'), '/operations/jobs'),
      pageLink(t('freight.pages.shipments'), '/operations/shipments'),
      pageLink(t('freight.pages.customs'), '/operations/customs'),
      pageLink(t('freight.pages.documents'), '/operations/documents'),
      pageLink(t('freight.pages.deliveries'), '/operations/deliveries'),
    ], true),
    group(t('freight.nav.finance'), 'i-lucide-banknote', [
      pageLink(t('freight.pages.debitNotes'), '/finance/debit-notes'),
      pageLink(t('freight.pages.customerPayments'), '/finance/customer-payments'),
      pageLink(t('freight.pages.jobCharges'), '/finance/job-charges'),
      pageLink(t('freight.pages.supplierCosts'), '/finance/supplier-costs'),
      pageLink(t('freight.pages.supplierPayments'), '/finance/supplier-payments'),
      pageLink(t('freight.pages.accountsReceivable'), '/finance/accounts-receivable'),
      pageLink(t('freight.pages.accountsPayable'), '/finance/accounts-payable'),
      pageLink(t('freight.pages.jobProfitability'), '/finance/job-profitability'),
    ]),
    { label: t('freight.nav.reports'), icon: 'i-lucide-book-open-text', to: '/reports', exact: true, class: 'mt-1 text-sm gap-2', onSelect: close },
    group(t('freight.nav.master'), 'i-lucide-database', [
      pageLink(t('freight.pages.suppliers'), '/master-data/suppliers'),
      pageLink(t('freight.pages.zones'), '/master-data/zones'),
      pageLink(t('freight.pages.locations'), '/master-data/locations'),
      pageLink(t('freight.pages.equipmentTypes'), '/master-data/equipment-types'),
      pageLink(t('freight.pages.directions'), '/master-data/directions'),
      pageLink(t('freight.pages.chargeTypes'), '/master-data/charge-types'),
      pageLink(t('freight.pages.currencies'), '/master-data/currencies'),
    ]),
    group(t('freight.nav.settings'), 'i-lucide-settings', [
      pageLink(t('docetra.pages.appConfig'), '/settings/app-config'),
      pageLink(t('docetra.pages.appInfo'), '/settings/app-info'),
      pageLink(t('docetra.pages.storage'), '/settings/storage'),
    ]),
    group(t('freight.nav.userManagement'), 'i-lucide-shield', [
      pageLink(t('freight.pages.users'), '/administration/users'),
      pageLink(t('freight.pages.roles'), '/administration/roles'),
      pageLink(t('freight.pages.auditLogs'), '/administration/audit-logs'),
    ]),
  ], []])

  return { open, collapsed, links, close, setCollapsed }
}
