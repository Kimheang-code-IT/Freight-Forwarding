<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { PaginationState } from '@tanstack/vue-table'
import { h } from 'vue'
import { ULink } from '#components'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { usePageSeo } from '~/composables/usePageSeo'
import { formatFreightCell, formatMoney, freightStatusBadge, labeledStatusOptions } from '~/composables/freight/useFreight'
import type { FreightRecord } from '~/config/freight-seed'
import { CONTAINER_STATUSES, JOB_WORKFLOW_STATUS } from '~/config/freight-options'
import { downloadCsv } from '~/utils/export/csv'
import { paidAmountOf } from '~/utils/freight/finance'
import { agingBucket, buildStatementGroups, daysSince, postedJournalLines, reportRowDate, statementDifference as statementDifferenceOf } from '~/utils/freight/report'
import { isFilterValueActive } from '~/utils/filter/select-ui'
import { limitFilterSelects, matchesFilter } from '~/utils/filter/values'
import { listTableRowMetaColumn, listTableSelectColumn } from '~/utils/table/list-columns'
import { listTablePageSummary } from '~/utils/table/list-table'

type Column = { key: string, label: string, numeric?: boolean, status?: boolean }
type Filter = 'branch' | 'party' | 'status' | 'currency' | 'date'
type Report = { slug: string, group: 'operations' | 'finance', title: string, description: string, filters: Filter[], columns: Column[], statement?: boolean }
const c = (key: string, label: string, numeric = false, status = false): Column => ({ key, label, numeric, status })
const reports: Report[] = [
  { slug: 'service-orders', group: 'operations', title: 'Service Order Register', description: 'Complete register of freight service orders.', filters: ['branch', 'party', 'status', 'date'], columns: [c('jobNo','Job No.'),c('date','Date'),c('customer','Customer'),c('branchName','Branch'),c('direction','Direction'),c('containers','Containers',true),c('components','Components',true),c('chargeTotal','Charge Total',true),c('invoiceTotal','Invoice Total',true),c('workflowStatus','Status',false,true)] },
  { slug: 'service-order-status', group: 'operations', title: 'Service Order Status', description: 'See job progress, aging, and pending operational work.', filters: ['branch', 'party', 'status', 'date'], columns: [c('jobNo','Job No.'),c('customer','Customer'),c('branchName','Branch'),c('direction','Direction'),c('createdAt','Created Date'),c('workflowStatus','Status',false,true),c('daysOpen','Days Open',true),c('pendingComponents','Pending Components',true),c('lastActivity','Last Activity')] },
  { slug: 'containers', group: 'operations', title: 'Containers', description: 'Track actual containers attached to service orders.', filters: ['branch', 'party', 'status'], columns: [c('containerNo','Container No.'),c('containerType','Container Type'),c('jobNo','Service Job'),c('customer','Customer'),c('branchName','Branch'),c('sealNo','Seal'),c('status','Status',false,true),c('netWeightKg','Net Weight',true),c('grossWeightKg','Gross Weight',true),c('currentMilestone','Current Milestone')] },
  { slug: 'profitability', group: 'operations', title: 'Profitability', description: 'Compare operational values with posted accounting results.', filters: ['branch', 'party', 'currency', 'date'], columns: [c('jobNo','Job No.'),c('customer','Customer'),c('branchName','Branch'),c('quoted','Quoted',true),c('serviceCharges','Service Charges',true),c('postedRevenue','Posted Revenue',true),c('postedCost','Posted Cost',true),c('grossProfit','Gross Profit',true),c('margin','Margin %',true)] },
  { slug: 'revenue-expense', group: 'finance', title: 'Revenue & Expense', description: 'Posted revenue and expense activity for the selected period.', filters: ['branch', 'party', 'currency', 'date'], columns: [c('postingDate','Date'),c('account','Account'),c('category','Category'),c('party','Party'),c('jobNo','Service Job'),c('description','Description'),c('revenue','Revenue',true),c('expense','Expense',true),c('branchName','Branch')] },
  { slug: 'accounts-receivable', group: 'finance', title: 'Accounts Receivable', description: 'Posted customer balances and aging.', filters: ['branch', 'party', 'status', 'currency', 'date'], columns: [c('invoiceNo','Invoice No.'),c('customer','Customer'),c('jobNo','Service Job'),c('invoiceDate','Invoice Date'),c('dueDate','Due Date'),c('total','Total',true),c('paid','Paid',true),c('outstanding','Outstanding',true),c('aging','Aging'),c('status','Status',false,true)] },
  { slug: 'accounts-payable', group: 'finance', title: 'Accounts Payable', description: 'Posted supplier balances and aging.', filters: ['branch', 'party', 'status', 'currency', 'date'], columns: [c('invoiceNo','Bill No.'),c('supplier','Supplier'),c('jobNo','Service Job'),c('billDate','Bill Date'),c('dueDate','Due Date'),c('total','Total',true),c('paid','Paid',true),c('outstanding','Outstanding',true),c('aging','Aging'),c('status','Status',false,true)] },
  { slug: 'general-ledger', group: 'finance', title: 'General Ledger', description: 'Posted accounting movement by ledger account.', filters: ['branch', 'party', 'date'], columns: [c('postingDate','Posting Date'),c('journalNo','Journal No.'),c('sourceDocument','Source Document'),c('account','Account'),c('description','Description'),c('debit','Debit',true),c('credit','Credit',true),c('runningBalance','Running Balance',true),c('branchName','Branch')] },
  { slug: 'trial-balance', group: 'finance', title: 'Trial Balance', description: 'Verify debit and credit balances from posted journals.', filters: ['branch', 'date'], columns: [c('accountCode','Account Code'),c('accountName','Account Name'),c('openingDebit','Opening Debit',true),c('openingCredit','Opening Credit',true),c('periodDebit','Period Debit',true),c('periodCredit','Period Credit',true),c('closingDebit','Closing Debit',true),c('closingCredit','Closing Credit',true)] },
  { slug: 'profit-loss', group: 'finance', title: 'Profit & Loss', description: 'Operating result from posted revenue and expense accounts.', filters: ['branch', 'currency', 'date'], columns: [], statement: true },
  { slug: 'balance-sheet', group: 'finance', title: 'Balance Sheet', description: 'Financial position from posted asset, liability, and equity accounts.', filters: ['branch', 'currency', 'date'], columns: [], statement: true },
  { slug: 'cash-flow', group: 'finance', title: 'Cash Flow / Cash & Bank', description: 'Posted cash and bank activity without unsupported classifications.', filters: ['branch', 'currency', 'date'], columns: [c('postingDate','Date'),c('account','Account'),c('sourceDocument','Source'),c('journalNo','Reference'),c('party','Party'),c('description','Description'),c('cashIn','Cash In',true),c('cashOut','Cash Out',true),c('runningBalance','Running Balance',true)] },
]

const store = useFreightStore()
const route = useRoute()
const { t, te } = useI18n()
const { setTitle, clear } = useAppHeader()
const slug = computed(() => String(route.params.slug || 'service-orders'))
const report = computed(() => reports.find(item => item.slug === slug.value) || reports[0]!)
watchEffect(() => setTitle(report.value.title))
onBeforeUnmount(clear)
usePageSeo({ title: () => report.value.title })

const q = ref('')
const branch = ref<string[]>([])
const party = ref<string[]>([])
const status = ref<string[]>([])
const currency = ref<string[]>([])
const dateFrom = ref('')
const dateTo = ref('')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 20 })
const rowSelection = ref<Record<string, boolean>>({})
const postedLines = computed<FreightRecord[]>(() => postedJournalLines(store.list('journals'), store.list('chartOfAccounts')))
function jobByNo(value: unknown) { return store.list('jobs').find(row => String(row.jobNo) === String(value)) }
const rows = computed<FreightRecord[]>(() => {
  const jobs = store.list('jobs'), charges = store.list('jobCharges'), documents = store.list('debitNotes'), components = store.list('serviceComponents')
  if (['service-orders','service-order-status'].includes(slug.value)) return jobs.map(job => { const related = components.filter(r => r.jobNo === job.jobNo); return { ...job, workflowStatus: job.workflowStatus || job.status, containers: store.list('actualContainers').filter(r => r.jobNo === job.jobNo).length, components: related.length, chargeTotal: charges.filter(r => r.jobNo === job.jobNo).reduce((s,r) => s + Number(r.total || 0),0), invoiceTotal: documents.filter(r => r.jobNo === job.jobNo && String(r.status).toUpperCase() === 'POSTED').reduce((s,r) => s + Number(r.total || 0),0), daysOpen: daysSince(job.createdAt || job.date), pendingComponents: related.filter(r => String(r.status).toUpperCase() !== 'COMPLETED').length, lastActivity: job.updatedAt || job.createdAt || job.date } })
  if (slug.value === 'containers') return store.list('actualContainers').map(row => { const job = jobByNo(row.jobNo); return { ...row, customer: job?.customer, branchName: job?.branchName, currentMilestone: job?.stage || job?.workflowStatus || job?.status } })
  if (slug.value === 'profitability') return store.list('profitability').map(row => { const job = jobByNo(row.jobNo), serviceCharges = charges.filter(r => r.jobNo === row.jobNo).reduce((s,r) => s + Number(r.total || 0),0), postedRevenue = Number(row.postedRevenue || 0), postedCost = Number(row.totalCost || 0); return { ...row, branchName: job?.branchName, date: job?.date, currency: job?.currency || 'USD', quoted: Number(job?.quotationAmount || job?.amount || 0), serviceCharges, postedRevenue, postedCost, grossProfit: postedRevenue-postedCost, margin: postedRevenue ? (postedRevenue-postedCost)/postedRevenue*100 : 0 } })
  if (slug.value === 'accounts-receivable') return store.list('receivables').map(row => ({ ...row, invoiceDate: row.date, paid: paidAmountOf(row), aging: agingBucket(row.dueDate, t, te) }))
  if (slug.value === 'accounts-payable') return store.list('payables').map(row => ({ ...row, billDate: row.date, paid: paidAmountOf(row), aging: agingBucket(row.dueDate, t, te) }))
  if (slug.value === 'revenue-expense') return postedLines.value.filter(r => ['Revenue','Expense'].includes(String(r.accountType))).map(r => ({ ...r, category: r.accountType, revenue: r.accountType === 'Revenue' ? Number(r.credit)-Number(r.debit) : 0, expense: r.accountType === 'Expense' ? Number(r.debit)-Number(r.credit) : 0 }))
  if (slug.value === 'trial-balance') { const map = new Map<string,FreightRecord>(); for (const line of postedLines.value) { const key=String(line.accountCode), row=map.get(key)||{id:key,accountCode:key,accountName:line.accountName,openingDebit:0,openingCredit:0,periodDebit:0,periodCredit:0,closingDebit:0,closingCredit:0}; row.periodDebit=Number(row.periodDebit)+Number(line.debit); row.periodCredit=Number(row.periodCredit)+Number(line.credit); const balance=Number(row.periodDebit)-Number(row.periodCredit); row.closingDebit=Math.max(balance,0); row.closingCredit=Math.max(-balance,0); map.set(key,row) } return [...map.values()] }
  if (slug.value === 'cash-flow') { let balance=0; const codes=new Set(store.list('financialAccounts').map(r=>String(r.ledgerCode))); return postedLines.value.filter(r=>codes.has(String(r.accountCode))).map(r=>{const cashIn=Number(r.debit),cashOut=Number(r.credit);balance+=cashIn-cashOut;return{...r,cashIn,cashOut,runningBalance:balance}}) }
  return postedLines.value
})
const filtered = computed(() => rows.value.filter((row) => {
  const text = Object.values(row).join(' ').toLowerCase()
  const day = reportRowDate(row)
  const rowParty = String(row.customer || row.supplier || row.party || '')
  return (!q.value || text.includes(q.value.toLowerCase()))
    && matchesFilter(row.branchName, branch.value)
    && matchesFilter(rowParty, party.value)
    && matchesFilter(row.status || row.workflowStatus, status.value)
    && matchesFilter(row.currency, currency.value)
    && (!dateFrom.value || day >= dateFrom.value)
    && (!dateTo.value || day <= dateTo.value)
}))
watch([q, branch, party, status, currency, dateFrom, dateTo, slug], () => {
  rowSelection.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
})
const choices = (getter:(r:FreightRecord)=>unknown) => computed(() => [...new Set(rows.value.map(r=>String(getter(r)||'')).filter(Boolean))].sort().map(value=>({label:value,value})))
const branchItems=choices(r=>r.branchName), partyItems=choices(r=>r.customer||r.supplier||r.party), currencyItems=choices(r=>r.currency)
const statusItems=computed(()=>{
  if (['service-orders','service-order-status'].includes(slug.value)) return labeledStatusOptions(JOB_WORKFLOW_STATUS, t, te)
  if (slug.value==='containers') return labeledStatusOptions(CONTAINER_STATUSES, t, te)
  return [...new Set(rows.value.map(r=>String(r.status||r.workflowStatus||'')).filter(Boolean))].sort().map(value=>({label:value,value}))
})
type ReportFilterKey = 'branch' | 'party' | 'status' | 'currency'
const filterSelects = computed<Array<{ key: ReportFilterKey, items: Array<{ label: string, value: string }>, placeholder: string, width: string }>>(() => {
  const selects: Array<{ key: ReportFilterKey, items: Array<{ label: string, value: string }>, placeholder: string, width: string }> = []
  if (report.value.filters.includes('branch')) selects.push({ key: 'branch', items: branchItems.value, placeholder: t('freight.ui.branchCol'), width: 'w-36' })
  if (report.value.filters.includes('party')) selects.push({ key: 'party', items: partyItems.value, placeholder: t('freight.fields.party'), width: 'w-44' })
  if (report.value.filters.includes('status')) selects.push({ key: 'status', items: statusItems.value, placeholder: t('freight.ui.status'), width: 'w-36' })
  if (report.value.filters.includes('currency')) selects.push({ key: 'currency', items: currencyItems.value, placeholder: t('freight.ui.cols.currency'), width: 'w-28' })
  return limitFilterSelects(selects, report.value.filters.includes('date'), select => select.key === 'status')
})
const filterValues = computed<Record<ReportFilterKey, string[]>>(() => ({
  branch: branch.value,
  party: party.value,
  status: status.value,
  currency: currency.value,
}))

function setFilterValue(key: ReportFilterKey, value: string[] | string | undefined) {
  const next = Array.isArray(value) ? value : value ? [value] : []
  if (key === 'branch') branch.value = next
  else if (key === 'party') party.value = next
  else if (key === 'status') status.value = next
  else currency.value = next
}

const statementGroups=computed(()=>buildStatementGroups(postedLines.value, slug.value==='profit-loss'?['Revenue','Expense']:['Asset','Liability','Equity']))
const statementDifference=computed(()=>statementDifferenceOf(statementGroups.value, slug.value==='balance-sheet'))
function actions(row:FreightRecord):DropdownMenuItem[][]{const job=jobByNo(row.jobNo);return job?[[{label:t('freight.ui.open'),icon:'i-lucide-eye',onSelect:()=>navigateTo(`/service-orders/${job.id}`)},{label:t('freight.jobSections.charges'),icon:'i-lucide-receipt-text',onSelect:()=>navigateTo(`/service-charges?jobNo=${encodeURIComponent(String(row.jobNo))}`)},{label:t('freight.jobSections.finance'),icon:'i-lucide-banknote',onSelect:()=>navigateTo(`/finance/documents?jobNo=${encodeURIComponent(String(row.jobNo))}`)}]]:[]}
const columns=computed<TableColumn<FreightRecord>[]>(()=>{
  const list=report.value.columns.map(column=>({accessorKey:column.key,header:column.numeric?()=>h('span',{class:'block text-right'},column.label):column.label,enableSorting:false,meta:column.numeric?{class:{th:'text-right',td:'text-right tabular-nums whitespace-nowrap'}}:undefined,cell:({row}:{row:{original:FreightRecord}})=>{if(column.status)return freightStatusBadge(row.original[column.key],column.key);if(column.key==='jobNo'&&report.value.group==='operations'){const job=jobByNo(row.original.jobNo);if(job)return h(ULink,{to:`/service-orders/${job.id}`,class:'font-medium text-highlighted hover:text-primary hover:underline'},()=>String(row.original.jobNo||'—'))}return formatFreightCell(row.original[column.key],column.key)}}))
  return [
    listTableSelectColumn<FreightRecord>(t),
    ...list,
    listTableRowMetaColumn<FreightRecord>({
      summary: listTablePageSummary(t, filtered.value.length, pagination.value),
      items: actions,
    }),
  ]
})
const hasActiveFilters = computed(() => Boolean(
  q.value
  || isFilterValueActive(branch.value)
  || isFilterValueActive(party.value)
  || isFilterValueActive(status.value)
  || isFilterValueActive(currency.value)
  || dateFrom.value
  || dateTo.value,
))
function clearFilters() {
  q.value = ''
  branch.value = []
  party.value = []
  status.value = []
  currency.value = []
  dateFrom.value = ''
  dateTo.value = ''
}
const exportFields=computed(()=>report.value.statement?[{label:'Section',value:'section'},{label:'Account',value:'account'},{label:'Amount',value:'amount'}]:report.value.columns.map(column=>({label:column.label,value:column.key})))
function exportCsv(request:{fieldCodes:string[]}){const statementRows=statementGroups.value.flatMap(group=>group.rows.map(row=>({section:group.type,account:row.name,amount:row.amount}))),source=(report.value.statement?statementRows:filtered.value) as Array<Record<string,unknown>>,codes=request.fieldCodes.length?request.fieldCodes:exportFields.value.map(field=>field.value);downloadCsv({filename:`${report.value.slug}-${new Date().toISOString().slice(0,10)}.csv`,fields:codes.map(key=>({label:exportFields.value.find(field=>field.value===key)?.label||key,value:key})),rows:source})}
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
    <LayoutAppHeaderPageActions
      :can-create="false"
      :export-fields="exportFields"
      @refresh="store.reload()"
      @export="exportCsv"
    />
    <template v-if="!report.statement">
      <TableAppListTable
        v-model:search="q"
        v-model:date-start="dateFrom"
        v-model:date-end="dateTo"
        v-model:row-selection="rowSelection"
        v-model:pagination="pagination"
        :data="filtered"
        :columns="columns"
        :show-date-range="report.filters.includes('date')"
        :filters-active="hasActiveFilters"
      >
      <template #filters="{ compact }">
        <CommonAppFilterSelect
          v-for="select in filterSelects"
          :key="select.key"
          :model-value="filterValues[select.key]"
          :items="select.items"
          :placeholder="select.placeholder"
          :class="compact ? 'w-full' : select.width"
          @update:model-value="setFilterValue(select.key, $event)"
        />
      </template>
        <template #actions>
          <UButton
            v-if="hasActiveFilters"
            :label="t('freight.ui.clear')"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="clearFilters"
          />
        </template>
      </TableAppListTable>
    </template>
    <template v-else>
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-1.5 pt-1.5 pb-0">
        <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-default bg-default shadow-xs">
          <div class="flex items-center gap-3 border-b border-default px-2 py-2">
            <CommonAppLiveSearch v-model="q" class="w-40 shrink-0 sm:w-56 lg:w-64" :placeholder="t('freight.ui.search')" />
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2">
              <CommonAppFilterMenu :active="hasActiveFilters">
                <template #default="{ compact }">
                  <CommonAppFilterSelect
                    v-if="report.filters.includes('branch')"
                    v-model="branch"
                    :items="branchItems"
                    :placeholder="t('freight.ui.branchCol')"
                    class="w-36"
                  />
                  <CommonAppFilterSelect
                    v-if="report.filters.includes('currency')"
                    v-model="currency"
                    :items="currencyItems"
                    :placeholder="t('freight.ui.cols.currency')"
                    class="w-28"
                  />
                  <CommonAppDateRangeFilter
                    v-if="report.filters.includes('date')"
                    v-model:start="dateFrom"
                    v-model:end="dateTo"
                    granularity="day"
                    :inline="compact"
                    :label="t('freight.ui.date')"
                  />
                </template>
              </CommonAppFilterMenu>
              <UButton
                v-if="hasActiveFilters"
                :label="t('freight.ui.clear')"
                color="neutral"
                variant="ghost"
                size="sm"
                class="shrink-0"
                @click="clearFilters"
              />
            </div>
          </div>
          <section class="min-h-0 flex-1 overflow-auto p-5">
            <div class="mx-auto max-w-3xl space-y-5">
              <div v-for="group in statementGroups" :key="group.type">
                <h2 class="border-b border-default pb-1.5 text-sm font-semibold">{{ group.type }}</h2>
                <div v-for="row in group.rows" :key="row.name" class="flex justify-between px-3 py-1.5 text-sm">
                  <span>{{ row.name }}</span>
                  <span class="tabular-nums">{{ formatMoney(row.amount) }}</span>
                </div>
                <div class="flex justify-between border-t border-default px-3 pt-2 text-sm font-semibold">
                  <span>Total {{ group.type }}</span>
                  <span>{{ formatMoney(group.total) }}</span>
                </div>
              </div>
              <div class="flex justify-between border-t-2 border-default px-3 pt-3 font-semibold">
                <span>{{ report.slug === 'profit-loss' ? 'Net Profit' : 'Difference' }}</span>
                <span>{{ formatMoney(statementDifference) }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

