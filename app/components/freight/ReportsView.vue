<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PaginationState } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { usePageSeo } from '~/composables/usePageSeo'
import { formatFreightCell, statusColor } from '~/composables/freight/useFreight'
import type { FreightRecord } from '~/config/freight-seed'
import { buildGeneralLedger } from '~/utils/freight/general-ledger'
import { parsePageLimit, TABLE_PAGE_SIZES } from '~/utils/pagination'
import { freightTableFillUiReadonly } from '~/utils/table/theme'

type ReportDefinition = { slug: string, groupKey: string, titleKey: string, columns: Array<[string, string]> }
const reports: ReportDefinition[] = [
  { slug: 'open-service-orders', groupKey: 'operations', titleKey: 'openServiceOrders', columns: [['jobNo', 'serviceOrderNo'], ['customer', 'customer'], ['branchName', 'branch'], ['direction', 'tradeDirection'], ['workflowStatus', 'status'], ['createdAt', 'createdAt']] },
  { slug: 'service-order-charges', groupKey: 'operations', titleKey: 'serviceOrderCharges', columns: [['chargeNo', 'chargeNo'], ['jobNo', 'serviceOrder'], ['customer', 'customer'], ['documentDate', 'date'], ['currency', 'currency'], ['total', 'total'], ['status', 'status']] },
  { slug: 'issued-charges-not-converted', groupKey: 'operations', titleKey: 'issuedNotConverted', columns: [['chargeNo', 'chargeNo'], ['jobNo', 'serviceOrder'], ['customer', 'customer'], ['documentDate', 'date'], ['currency', 'currency'], ['total', 'total'], ['status', 'status']] },
  { slug: 'customer-invoices', groupKey: 'receivables', titleKey: 'customerInvoices', columns: [['debitNoteNo', 'documentNo'], ['customer', 'customer'], ['jobNo', 'serviceOrder'], ['date', 'date'], ['dueDate', 'dueDate'], ['currency', 'currency'], ['total', 'total'], ['status', 'status']] },
  { slug: 'outstanding-receivables', groupKey: 'receivables', titleKey: 'outstandingReceivables', columns: [['invoiceNo', 'invoiceNo'], ['customer', 'customer'], ['jobNo', 'serviceOrder'], ['dueDate', 'dueDate'], ['currency', 'currency'], ['outstanding', 'outstanding'], ['status', 'status']] },
  { slug: 'supplier-bills', groupKey: 'payables', titleKey: 'supplierBills', columns: [['debitNoteNo', 'documentNo'], ['customer', 'supplier'], ['jobNo', 'serviceOrder'], ['date', 'date'], ['dueDate', 'dueDate'], ['currency', 'currency'], ['total', 'total'], ['status', 'status']] },
  { slug: 'outstanding-payables', groupKey: 'payables', titleKey: 'outstandingPayables', columns: [['invoiceNo', 'billNo'], ['supplier', 'supplier'], ['jobNo', 'serviceOrder'], ['dueDate', 'dueDate'], ['currency', 'currency'], ['outstanding', 'outstanding'], ['status', 'status']] },
  { slug: 'customer-receipts', groupKey: 'payments', titleKey: 'customerReceipts', columns: [['paymentNo', 'receiptNo'], ['customer', 'customer'], ['jobNo', 'serviceOrder'], ['date', 'date'], ['currency', 'currency'], ['received', 'amount'], ['unallocatedAmount', 'unallocated'], ['status', 'status']] },
  { slug: 'supplier-payments', groupKey: 'payments', titleKey: 'supplierPayments', columns: [['paymentNo', 'paymentNo'], ['supplier', 'supplier'], ['jobNo', 'serviceOrder'], ['date', 'date'], ['currency', 'currency'], ['amount', 'amount'], ['status', 'status']] },
  { slug: 'unallocated-payments', groupKey: 'payments', titleKey: 'unallocatedPayments', columns: [['paymentNo', 'receiptNo'], ['customer', 'customer'], ['date', 'date'], ['currency', 'currency'], ['received', 'amount'], ['unallocatedAmount', 'unallocated'], ['status', 'status']] },
  { slug: 'revenue', groupKey: 'accounting', titleKey: 'revenue', columns: [['debitNoteNo', 'documentNo'], ['customer', 'customer'], ['jobNo', 'serviceOrder'], ['postingDate', 'postingDate'], ['currency', 'currency'], ['total', 'revenue'], ['status', 'status']] },
  { slug: 'expenses', groupKey: 'accounting', titleKey: 'expenses', columns: [['invoiceNo', 'documentNo'], ['supplier', 'supplier'], ['jobNo', 'serviceOrder'], ['date', 'date'], ['currency', 'currency'], ['amount', 'expense'], ['status', 'status']] },
  { slug: 'general-ledger', groupKey: 'accounting', titleKey: 'generalLedger', columns: [['postingDate', 'postingDate'], ['account', 'account'], ['debit', 'debit'], ['credit', 'credit'], ['balance', 'balance'], ['voucherType', 'voucherType'], ['voucherNo', 'voucherNo'], ['party', 'party'], ['jobNo', 'serviceOrder']] },
  { slug: 'trial-balance', groupKey: 'accounting', titleKey: 'trialBalance', columns: [['account', 'account'], ['debit', 'debit'], ['credit', 'credit'], ['balance', 'balance']] },
  { slug: 'service-order-profitability', groupKey: 'profitability', titleKey: 'serviceOrderProfitability', columns: [['jobNo', 'serviceOrder'], ['customer', 'customer'], ['direction', 'tradeDirection'], ['totalRevenue', 'revenue'], ['totalCost', 'cost'], ['profit', 'profit'], ['margin', 'margin']] },
]

const store = useFreightStore()
const route = useRoute()
const { t } = useI18n()
const { setTitle, clear } = useAppHeader()
const reportSlug = computed(() => String(route.params.slug || 'general-ledger'))
const report = computed(() => reports.find(item => item.slug === reportSlug.value) || reports.find(item => item.slug === 'general-ledger')!)
const reportTitle = computed(() => t(`freight.reportCatalog.titles.${report.value.titleKey}`))
watchEffect(() => setTitle(reportTitle.value))
onBeforeUnmount(clear)
usePageSeo({ title: () => reportTitle.value })

const q = ref('')
const status = ref('')
const currency = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 50 })
const paginationOptions = { getPaginationRowModel: getPaginationRowModel() }
const ledgerRows = computed(() => buildGeneralLedger({ debitNotes: store.list('debitNotes'), customerPayments: store.list('customerPayments'), supplierCosts: store.list('supplierCosts'), supplierPayments: store.list('supplierPayments'), journals: store.list('journals') }) as unknown as FreightRecord[])

const allRows = computed<FreightRecord[]>(() => {
  const finance = store.list('debitNotes')
  const slug = report.value.slug
  if (slug === 'open-service-orders') return store.list('jobs').filter(row => ['DRAFT', 'OPEN', 'IN_PROGRESS', 'ON_HOLD'].includes(String(row.workflowStatus || row.status).toUpperCase().replaceAll(' ', '_')))
  if (slug === 'service-order-charges') return store.list('jobCharges')
  if (slug === 'issued-charges-not-converted') return store.list('jobCharges').filter(row => String(row.status).toUpperCase() === 'ISSUED' && !row.financialDocumentId)
  if (slug === 'customer-invoices') return finance.filter(row => String(row.documentType || 'CUSTOMER_INVOICE') === 'CUSTOMER_INVOICE')
  if (slug === 'outstanding-receivables') return store.list('receivables').filter(row => Number(row.outstanding) > 0)
  if (slug === 'supplier-bills') return finance.filter(row => String(row.documentType) === 'SUPPLIER_BILL')
  if (slug === 'outstanding-payables') return store.list('payables').filter(row => Number(row.outstanding) > 0)
  if (slug === 'customer-receipts') return store.list('customerPayments')
  if (slug === 'supplier-payments') return store.list('supplierPayments')
  if (slug === 'unallocated-payments') return store.list('customerPayments').filter(row => Number(row.unallocatedAmount) > 0)
  if (slug === 'revenue') return finance.filter(row => String(row.documentType || 'CUSTOMER_INVOICE') === 'CUSTOMER_INVOICE' && String(row.status).toUpperCase() === 'POSTED')
  if (slug === 'expenses') return store.list('supplierCosts')
  if (slug === 'service-order-profitability') return store.list('profitability')
  if (slug === 'trial-balance') {
    const grouped = new Map<string, FreightRecord>()
    for (const row of ledgerRows.value) {
      const account = String(row.account || 'Unassigned')
      const current = grouped.get(account) || { id: account, account, debit: 0, credit: 0, balance: 0 }
      current.debit = Number(current.debit || 0) + Number(row.debit || 0)
      current.credit = Number(current.credit || 0) + Number(row.credit || 0)
      current.balance = Number(current.debit) - Number(current.credit)
      grouped.set(account, current)
    }
    return [...grouped.values()]
  }
  return ledgerRows.value
})

function rowDate(row: FreightRecord) { return String(row.postingDate || row.documentDate || row.date || row.createdAt || '').slice(0, 10) }
const filtered = computed(() => allRows.value.filter((row) => {
  const haystack = Object.values(row).map(value => String(value || '')).join(' ').toLowerCase()
  const date = rowDate(row)
  return (!q.value || haystack.includes(q.value.toLowerCase())) && (!status.value || String(row.status || row.workflowStatus) === status.value) && (!currency.value || String(row.currency) === currency.value) && (!dateFrom.value || date >= dateFrom.value) && (!dateTo.value || date <= dateTo.value)
}))
const selectItems = (key: string) => computed(() => [...new Set(allRows.value.map(row => String(row[key] || '')).filter(Boolean))].sort().map(value => ({ label: value, value })))
const statusItems = computed(() => selectItems('status').value.map(item => ({ ...item, label: t(`freight.reportCatalog.statuses.${item.value.toLowerCase().replaceAll(' ', '_')}`) })))
const currencyItems = selectItems('currency')
const numericKey = (key: string) => /amount|total|debit|credit|balance|outstanding|revenue|cost|profit|margin/i.test(key)
const UBadge = resolveComponent('UBadge')
const columns = computed<TableColumn<FreightRecord>[]>(() => report.value.columns.map(([key, labelKey]) => ({
  accessorKey: key, header: numericKey(key) ? () => h('span', { class: 'block w-full text-right' }, t(`freight.reportCatalog.columns.${labelKey}`)) : t(`freight.reportCatalog.columns.${labelKey}`), enableSorting: false,
  meta: numericKey(key) ? { class: { th: 'text-right', td: 'text-right tabular-nums' } } : undefined,
  cell: ({ row }) => key.toLowerCase().includes('status') ? h(UBadge, { color: statusColor(String(row.original[key] || '')), variant: 'subtle' }, () => formatFreightCell(row.original[key], key)) : formatFreightCell(row.original[key], key),
})))
watch([q, status, currency, dateFrom, dateTo, reportSlug], () => { pagination.value.pageIndex = 0 })
function setPageSize(value: unknown) { pagination.value = { pageIndex: 0, pageSize: parsePageLimit(value, 50) } }
function setPage(page: number) { pagination.value = { ...pagination.value, pageIndex: Math.max(0, page - 1) } }
function clearFilters() { q.value = ''; status.value = ''; currency.value = ''; dateFrom.value = ''; dateTo.value = '' }
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/20">
    <LayoutAppHeaderPageActions :can-create="false" @refresh="store.reload()" />
    <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-1.5 pt-1.5 pb-0">
      <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-default bg-default shadow-xs">
        <div class="flex items-center gap-2 border-b border-default px-2 py-2">
          <USelect :model-value="report.slug" :items="reports.map(item => ({ label: `${t(`freight.reportCatalog.groups.${item.groupKey}`)} · ${t(`freight.reportCatalog.titles.${item.titleKey}`)}`, value: item.slug }))" size="sm" class="w-72 shrink-0" @update:model-value="navigateTo(`/reports/${String($event)}`)" />
          <CommonAppLiveSearch v-model="q" class="w-56 shrink-0 sm:w-64" :placeholder="t('freight.reportCatalog.search')" />
          <div class="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
            <USelect :model-value="status || undefined" :items="statusItems" :placeholder="t('freight.reportCatalog.columns.status')" size="sm" class="w-36 shrink-0" @update:model-value="status = String($event || '')" />
            <USelect :model-value="currency || undefined" :items="currencyItems" :placeholder="t('freight.reportCatalog.columns.currency')" size="sm" class="w-28 shrink-0" @update:model-value="currency = String($event || '')" />
            <CommonAppDateRangeFilter v-model:start="dateFrom" v-model:end="dateTo" granularity="day" class="shrink-0" :label="t('freight.reportCatalog.columns.date')" />
            <UButton v-if="q || status || currency || dateFrom || dateTo" color="neutral" variant="ghost" size="sm" :label="t('freight.ui.clear')" @click="clearFilters" />
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <UTable v-model:pagination="pagination" :data="filtered" :columns="columns" :get-row-id="(row: FreightRecord) => String(row.id)" :pagination-options="paginationOptions" sticky="header" class="freight-table h-full min-h-0" :ui="freightTableFillUiReadonly" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-3 py-2">
          <USelect :model-value="String(pagination.pageSize)" :items="TABLE_PAGE_SIZES.map(value => ({ label: String(value), value: String(value) }))" size="xs" class="w-20" @update:model-value="setPageSize" />
          <span class="text-xs text-muted">{{ t('freight.reportCatalog.rowCount', { count: filtered.length }) }} · {{ reportTitle }}</span>
          <UPagination :page="pagination.pageIndex + 1" :items-per-page="pagination.pageSize" :total="filtered.length" @update:page="setPage" />
        </div>
      </div>
    </div>
  </div>
</template>
