<script setup lang="ts">
import type { DropdownMenuItem, TableColumn, TableRow } from '@nuxt/ui'
import type { PaginationState } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { useConfirm } from '~/composables/common/useConfirm'
import { usePageSeo } from '~/composables/usePageSeo'
import {
  formatFreightCell,
  statusColor,
  useFreightLabel,
  useFreightRouteModule,
} from '~/composables/freight/useFreight'
import { useLcs } from '~/composables/lcs/useLcs'
import type { FreightRecord } from '~/config/freight-seed'
import { chargeDomainStatus, financeDomainStatus, jobDomainStatus, quotationDomainStatus } from '~/utils/lcs/states'
import { isNumericKey, jobWorkspacePath, workspaceSectionForPath } from '~/utils/freight/job-workspace'
import { getFilterSelectUi, isFilterValueActive } from '~/utils/filter/select-ui'
import { parsePageLimit, TABLE_PAGE_SIZES } from '~/utils/pagination'
import { freightTableFillUi, freightTableCheckboxMeta, TABLE_VIRTUALIZE_AFTER } from '~/utils/table/theme'

const { module, route } = useFreightRouteModule()
const store = useFreightStore()
const auth = useAuthStore()
const lcs = useLcs()
const { t } = useI18n()
const { fieldLabel, moduleTitle, moduleSingular } = useFreightLabel()
const { setTitle, setBreadcrumbs, clear } = useAppHeader()
const { confirm } = useConfirm()
const toast = useToast()
const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UIcon = resolveComponent('UIcon')
const ULink = resolveComponent('ULink')

const q = ref('')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 20 })
const filters = reactive<Record<string, string>>({})
const rowSelection = ref<Record<string, boolean>>({})
const pending = ref(false)
const dateFrom = ref('')
const dateTo = ref('')

const current = computed(() => module.value)
const canManageModule = computed(() => {
  if (!current.value) return false
  if (auth.user?.pageAccess?.includes('ALL_PAGES')) return true
  if (current.value.collection === 'chartOfAccounts' || current.value.collection === 'financialAccounts') return lcs.can('chart_of_accounts.manage')
  if (current.value.collection === 'organizations') return lcs.can('organization.update')
  if (current.value.collection === 'branches') return lcs.can('branch.manage')
  if (current.value.group === 'master' || current.value.group === 'configuration') return false
  return true
})
const canCreate = computed(() => Boolean(current.value?.canCreate) && !current.value?.readOnly && canManageModule.value)
const canMutate = computed(() => Boolean(current.value) && !current.value?.readOnly && canManageModule.value)
const deactivationOnly = computed(() => current.value?.group === 'master')
const dateField = computed(() => {
  const fields = current.value?.fields || []
  return fields.find(field => field.type === 'date' || field.type === 'datetime' || field.key === 'date' || /date$/i.test(field.key))?.key
    || current.value?.columns.find(column => /date/i.test(column.key))?.key
})

const result = computed(() => {
  if (!current.value) return { rows: [], total: 0, all: [] }
  pending.value = false
  return store.query(current.value, {
    q: q.value,
    filters,
    paginate: false,
    dateField: dateField.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
  })
})
const selectedIds = computed(() => Object.keys(rowSelection.value).filter(id => rowSelection.value[id]))
const virtualize = computed(() => {
  const count = result.value.total
  if (count < TABLE_VIRTUALIZE_AFTER && pagination.value.pageSize < TABLE_VIRTUALIZE_AFTER) return false
  return {
    estimateSize: 48,
    overscan: 12,
  }
})
const paginationOptions = { getPaginationRowModel: getPaginationRowModel() }

watch(current, (value) => {
  if (!value) return
  setTitle(moduleTitle(value))
  setBreadcrumbs([{ label: moduleTitle(value) }])
  rowSelection.value = {}
  for (const filter of value.filters || []) {
    const fromQuery = String(route.query[filter.key] || '')
    filters[filter.key] = fromQuery || filters[filter.key] || ''
  }
}, { immediate: true })

onBeforeUnmount(clear)

usePageSeo({
  title: () => current.value ? moduleTitle(current.value) : t('freight.pages.dashboard'),
})

watch([q, filters, dateFrom, dateTo], () => {
  rowSelection.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
}, { deep: true })

const jobsByNo = computed(() => {
  const map = new Map<string, string>()
  for (const job of store.list('jobs')) {
    map.set(String(job.jobNo || ''), String(job.id))
  }
  return map
})

function jobLinkFor(jobNo: unknown) {
  const id = jobsByNo.value.get(String(jobNo || ''))
  if (!id || !current.value) return ''
  return jobWorkspacePath(id, workspaceSectionForPath(current.value.path))
}

function recordPath(id: unknown) {
  if (!current.value) return '/'
  return `${current.value.path}/${id}`
}

function cellText(row: Record<string, unknown>, key: string) {
  return formatFreightCell(row[key], key)
}

function rowStamp(row: Record<string, unknown>) {
  return String(row.updatedAt || row.createdAt || row.date || row.occurredAt || '')
}

function relativeTime(value: unknown) {
  const raw = String(value || '')
  if (!raw) return '—'
  const date = new Date(raw.includes('T') || raw.includes(' ') ? raw : `${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return t('freight.ui.justNow')
  if (abs < 3600) {
    const mins = Math.max(1, Math.round(abs / 60))
    return t('freight.ui.minutesAgo', { n: mins })
  }
  if (abs < 86400) {
    const hours = Math.max(1, Math.round(abs / 3600))
    return t('freight.ui.hoursAgo', { n: hours })
  }
  const days = Math.max(1, Math.round(abs / 86400))
  return t('freight.ui.daysAgo', { n: days })
}

function commentCount(row: Record<string, unknown>) {
  const comments = row.comments
  return Array.isArray(comments) ? comments.length : 0
}

const pageSummary = computed(() => {
  const total = result.value.total
  if (!total) return t('freight.ui.ofZero')
  const start = pagination.value.pageIndex * pagination.value.pageSize
  const end = Math.min(start + pagination.value.pageSize, total)
  const shown = Math.max(0, end - start)
  return t('freight.ui.of', { shown, total })
})

function initials(row: Record<string, unknown>) {
  const name = String(row.assignedStaff || row.user || row.contact || row.updatedBy || 'SYS')
  const parts = name.split(/[\s.]+/).filter(Boolean)
  return (parts.slice(0, 2).map(part => part[0]).join('') || 'SY').toUpperCase()
}

function rowMenuItems(row: Record<string, unknown>): DropdownMenuItem[][] {
  const items: DropdownMenuItem[] = [
    {
      label: t('freight.ui.open'),
      icon: 'i-lucide-eye',
      onSelect: () => openRow(row),
    },
  ]
  const collection = current.value?.collection
  if (collection === 'quotations') {
    const status = quotationDomainStatus(row.status)
    if (status === 'DRAFT' && lcs.can('quotation.update_draft')) {
      items.push({ label: t('freight.ui.editDraft'), icon: 'i-lucide-pencil', onSelect: () => openRow(row) })
      items.push({ label: t('freight.ui.send'), icon: 'i-lucide-send', onSelect: () => { void runRowAction('send', row) } })
    }
    if (status === 'SENT' && lcs.can('quotation.create')) items.push({ label: t('freight.ui.createRevision'), icon: 'i-lucide-git-branch', onSelect: () => { void runRowAction('createRevision', row) } })
    if (status === 'SENT' && lcs.can('quotation.accept')) {
      items.push({ label: t('freight.ui.accept'), icon: 'i-lucide-check', onSelect: () => { void runRowAction('accept', row) } })
      items.push({ label: t('freight.ui.reject'), icon: 'i-lucide-x', color: 'error', onSelect: () => { void runRowAction('reject', row) } })
    }
    if (status === 'ACCEPTED' && lcs.can('quotation.convert')) items.push({ label: t('freight.ui.convertServiceOrder'), icon: 'i-lucide-arrow-right', onSelect: () => { void runRowAction('convert', row) } })
    if (['DRAFT', 'SENT', 'ACCEPTED'].includes(status) && (lcs.can('quotation.update_draft') || lcs.can('quotation.accept'))) items.push({ label: t('freight.ui.cancel'), icon: 'i-lucide-ban', color: 'warning', onSelect: () => { void runRowAction('cancel', row) } })
  }
  else if (collection === 'jobs') {
    const status = jobDomainStatus(row)
    if (!['COMPLETED', 'CLOSED', 'CANCELLED'].includes(status) && lcs.can('service_order.update')) items.push({ label: t('freight.ui.changeStatus'), icon: 'i-lucide-refresh-cw', onSelect: () => openRow(row) })
    if (!['COMPLETED', 'CLOSED', 'CANCELLED'].includes(status) && lcs.can('service_order.complete')) items.push({ label: t('freight.ui.complete'), icon: 'i-lucide-check-circle-2', onSelect: () => { void runRowAction('completeJob', row) } })
    if (!['CLOSED', 'CANCELLED'].includes(status) && lcs.can('service_order.update')) items.push({ label: t('freight.ui.cancel'), icon: 'i-lucide-ban', color: 'warning', onSelect: () => { void runRowAction('cancelJob', row) } })
  }
  else if (collection === 'jobCharges') {
    const status = chargeDomainStatus(row.status)
    if (status === 'DRAFT' && lcs.can('service_charge.create')) items.push({ label: t('freight.ui.editDraft'), icon: 'i-lucide-pencil', onSelect: () => openRow(row) })
    if (status === 'DRAFT' && lcs.can('service_charge.issue')) items.push({ label: t('freight.ui.issue'), icon: 'i-lucide-send', onSelect: () => { void runRowAction('issueCharge', row) } })
    if (status === 'ISSUED' && !row.financialDocumentId && lcs.can('service_charge.convert_to_invoice')) items.push({ label: t('freight.ui.createFinanceInvoice'), icon: 'i-lucide-file-plus-2', onSelect: () => { void runRowAction('createInvoice', row) } })
  }
  else if (collection === 'debitNotes') {
    const status = financeDomainStatus(row.status)
    if (status === 'DRAFT' && lcs.can('financial_document.update_draft')) items.push({ label: t('freight.ui.editDraft'), icon: 'i-lucide-pencil', onSelect: () => openRow(row) })
    if (status === 'DRAFT' && lcs.can('financial_document.post')) items.push({ label: t('freight.ui.post'), icon: 'i-lucide-check-circle-2', onSelect: () => { void runRowAction('postDocument', row) } })
    if (status === 'POSTED' && lcs.can('financial_document.allocate')) items.push({ label: t('freight.ui.allocate'), icon: 'i-lucide-split', onSelect: () => openRow(row) })
    if (status === 'POSTED' && lcs.can('financial_document.reverse')) items.push({ label: t('freight.ui.reverse'), icon: 'i-lucide-undo-2', color: 'warning', onSelect: () => openRow(row) })
  }
  else if (collection === 'accountingPeriods' && lcs.can('accounting_period.close')) {
    const status = String(row.status || '').toUpperCase()
    if (status === 'OPEN' || status === 'REOPENED') items.push({ label: t('freight.ui.closePeriod'), icon: 'i-lucide-lock', color: 'warning', onSelect: () => { void runRowAction('closePeriod', row) } })
    if (status === 'CLOSED') items.push({ label: t('freight.ui.reopenPeriod'), icon: 'i-lucide-lock-open', onSelect: () => { void runRowAction('reopenPeriod', row) } })
  }
  if (canMutate.value) {
    items.push({
      label: t('freight.ui.duplicate'),
      icon: 'i-lucide-copy',
      onSelect: () => duplicateRow(row),
    })
    items.push({
      label: deactivationOnly.value ? t('freight.ui.deactivate') : t('freight.ui.delete'),
      icon: deactivationOnly.value ? 'i-lucide-circle-off' : 'i-lucide-trash-2',
      color: deactivationOnly.value ? 'warning' : 'error',
      onSelect: () => { void (deactivationOnly.value ? deactivateIds([String(row.id)]) : deleteIds([String(row.id)])) },
    })
  }
  return [items]
}

async function runRowAction(action: string, row: Record<string, unknown>) {
  try {
    const id = String(row.id || '')
    if (action === 'send') await lcs.runCommand('quotation.send', id, key => lcs.quotations.send(id, key))
    else if (action === 'accept') await lcs.runCommand('quotation.accept', id, key => lcs.quotations.accept(id, key))
    else if (action === 'createRevision') {
      const created = await lcs.quotations.createRevision(id)
      store.reload()
      await navigateTo(`/quotations/${created.id}`)
      return
    }
    else if (action === 'convert') {
      const job = await lcs.runCommand('quotation.convert', id, key => lcs.quotations.convert(id, key))
      await navigateTo(`/service-orders/${job.id}`)
      return
    }
    else if (action === 'reject' || action === 'cancel') {
      store.save('quotations', { ...row, id, status: action === 'reject' ? 'Rejected' : 'Cancelled' } as FreightRecord)
      store.addAudit(action === 'reject' ? 'Rejected quotation' : 'Cancelled quotation', 'Quotations', String(row.quotationNo || id))
    }
    else if (action === 'completeJob' || action === 'cancelJob') {
      store.save('jobs', { ...row, id, workflowStatus: action === 'completeJob' ? 'COMPLETED' : 'CANCELLED', status: action === 'completeJob' ? 'Financial Completed' : 'Cancelled' } as FreightRecord)
      store.addAudit(action === 'completeJob' ? 'Completed service order' : 'Cancelled service order', 'Service Orders', String(row.jobNo || id))
    }
    else if (action === 'issueCharge') await lcs.runCommand('charge.issue', id, key => lcs.charges.issue(id, key))
    else if (action === 'createInvoice') {
      const invoice = await lcs.runCommand('charge.create-invoice', id, key => lcs.charges.createFinanceInvoice(id, key))
      await navigateTo(`/finance/documents/${invoice.id}`)
      return
    }
    else if (action === 'postDocument') await lcs.runCommand('finance.post', id, key => lcs.finance.post(id, key))
    else if (action === 'closePeriod') await lcs.runCommand('period.close', id, key => lcs.finance.closePeriod(id, key))
    else if (action === 'reopenPeriod') {
      store.save('accountingPeriods', { ...row, id, status: 'REOPENED', closedBy: '', closedAt: '', updatedAt: new Date().toISOString() } as FreightRecord)
      store.addAudit('Reopened accounting period', 'Accounting Periods', String(row.code || id))
    }
    store.reload()
    toast.add({ title: t('freight.ui.actionCompleted'), color: 'success' })
  }
  catch (error) {
    lcs.reportError(error)
  }
}

const columns = computed<TableColumn<Record<string, unknown>>[]>(() => {
  if (!current.value) return []
  const summary = pageSummary.value
  const titleKey = current.value.titleField
  const dataColumns = current.value.columns.map((column, index) => ({
    accessorKey: column.key,
    enableSorting: false,
    header: fieldLabel(column),
    meta: isNumericKey(column.key)
      ? { class: { td: 'text-end tabular-nums whitespace-nowrap', th: 'text-end' } }
      : undefined,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const text = cellText(row.original, column.key)
      const isTitle = column.key === titleKey || (index === 0 && !current.value!.columns.some(item => item.key === titleKey))
      const jobTo = column.key === 'jobNo' && current.value!.collection !== 'jobs'
        ? jobLinkFor(row.original.jobNo)
        : ''
      if (jobTo) {
        return h(ULink, {
          to: jobTo,
          class: 'font-medium text-highlighted hover:text-primary hover:underline',
        }, () => text)
      }
      if (isTitle) {
        return h(ULink, {
          to: recordPath(row.original.id),
          class: 'font-medium text-highlighted hover:text-primary hover:underline',
        }, () => text)
      }
      if (column.key === 'status' || column.key.toLowerCase().includes('status')) {
        return h(UBadge, { color: statusColor(String(row.original[column.key] || '')), variant: 'subtle', class: 'capitalize' }, () => text)
      }
      if (column.key === 'direction' || column.key === 'stage') {
        return h(UBadge, { color: 'info', variant: 'subtle' }, () => text)
      }
      return h('span', { class: 'text-sm text-default' }, text)
    },
  }))

  return [
    {
      id: 'select',
      meta: freightTableCheckboxMeta,
      header: ({ table }) => h('div', { class: 'flex items-center justify-center' }, [
        h(UCheckbox, {
          'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
          'aria-label': t('freight.ui.selectAll'),
        }),
      ]),
      cell: ({ row }) => h('div', { class: 'flex items-center justify-center' }, [
        h(UCheckbox, {
          'modelValue': row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': t('freight.ui.selectRow'),
        }),
      ]),
      enableSorting: false,
      enableHiding: false,
    },
    ...dataColumns,
    {
      id: 'actions',
      header: () => h('div', { class: 'flex items-center justify-end gap-1.5 text-xs font-normal text-muted' }, [
        h('span', summary),
        h(UIcon, { name: 'i-lucide-heart', class: 'size-3.5' }),
      ]),
      enableSorting: false,
      enableHiding: false,
      meta: { class: { td: 'text-end whitespace-nowrap', th: 'w-52' } },
      cell: ({ row }) => h('div', { class: 'flex items-center justify-end gap-2' }, [
        h(UAvatar, {
          text: initials(row.original),
          size: '2xs',
          alt: initials(row.original),
        }),
        h('span', { class: 'min-w-[5.5rem] text-xs text-muted' }, relativeTime(rowStamp(row.original))),
        h('span', { class: 'inline-flex items-center gap-0.5 text-xs text-muted', title: t('freight.ui.comments') }, [
          h(UIcon, { name: 'i-lucide-message-square', class: 'size-3.5' }),
          String(commentCount(row.original)),
        ]),
        h(UButton, {
          icon: 'i-lucide-heart',
          color: row.original.favorite ? 'error' : 'neutral',
          variant: 'ghost',
          size: 'xs',
          square: true,
          class: row.original.favorite ? 'text-error' : 'text-muted',
          'aria-label': t('freight.ui.favorite'),
          onClick: (event: Event) => {
            event.stopPropagation()
            if (!current.value || current.value.readOnly) return
            store.save(current.value.collection, {
              ...row.original,
              id: String(row.original.id || ''),
              favorite: !row.original.favorite,
            })
          },
        }),
        h(UDropdownMenu, {
          content: { align: 'end' },
          items: rowMenuItems(row.original),
          'aria-label': t('freight.ui.actions'),
        }, () => h(UButton, {
          icon: 'i-lucide-ellipsis',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          'aria-label': t('freight.ui.actions'),
        })),
      ]),
    },
  ]
})

function openCreate() {
  if (!current.value) return
  navigateTo(`${current.value.path}/new`)
}

function openRow(row: Record<string, unknown>) {
  if (!current.value || !row.id) return
  navigateTo(recordPath(row.id))
}

function onRowSelect(event: Event, row: TableRow<Record<string, unknown>>) {
  const target = event.target as HTMLElement | null
  if (target?.closest('a, button, input, [role="checkbox"], [role="menuitem"], [data-slot="dropdown-menu"]')) return
  openRow(row.original)
}

function duplicateRow(row: Record<string, unknown>) {
  if (!current.value || !canMutate.value) return
  const titleKey = current.value.titleField
  const copy = store.duplicate(current.value.collection, String(row.id), {
    [titleKey]: `${row[titleKey] || 'Record'}-COPY`,
  })
  if (!copy) return
  store.addAudit('Duplicated', current.value.title, String(copy.id))
  toast.add({ title: t('freight.ui.duplicated'), color: 'success' })
  navigateTo(recordPath(copy.id))
}

async function deleteIds(ids: string[]) {
  if (!current.value || !canMutate.value || !ids.length) return
  const ok = await confirm({ kind: 'delete', count: ids.length })
  if (!ok) return
  store.remove(current.value.collection, ids)
  store.addAudit('Deleted', current.value.title, ids.join(', '))
  rowSelection.value = {}
  toast.add({ title: t('docetra.actions.deletedItems', { n: ids.length }), color: 'success' })
}

async function deactivateIds(ids: string[]) {
  if (!current.value || !canMutate.value || !ids.length) return
  for (const id of ids) {
    const record = store.get(current.value.collection, id)
    if (record) store.save(current.value.collection, { ...record, status: 'Inactive' })
  }
  store.addAudit('Deactivated', current.value.title, ids.join(', '))
  rowSelection.value = {}
  toast.add({ title: t('freight.ui.deactivated'), color: 'success' })
}

function refresh() {
  store.hydrate()
}

function setPageSize(value: unknown) {
  pagination.value = { pageIndex: 0, pageSize: parsePageLimit(value, 20) }
}

function setPage(page: number) {
  pagination.value = { ...pagination.value, pageIndex: Math.max(0, page - 1) }
}

function filterItems(filter: { options?: readonly string[] | string[], key: string }) {
  const fromOptions = [...(filter.options || [])]
  const fromData = current.value
    ? [...new Set(store.list(current.value.collection).map(row => String(row[filter.key] ?? '').trim()).filter(Boolean))]
    : []
  return [...new Set([...fromOptions, ...fromData])]
    .map(value => String(value).trim())
    .filter(Boolean)
    .map(value => ({ label: value, value }))
}
</script>

<template>
  <div v-if="current" class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/20">
    <LayoutAppHeaderPageActions
      :can-create="canCreate"
      :create-label="t('freight.ui.newEntity', { entity: moduleSingular(current) })"
      :refreshing="pending"
      @create="openCreate"
      @refresh="refresh"
    />

    <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-1.5 pt-1.5 pb-0">
      <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-default bg-default shadow-xs">
        <div class="flex items-center gap-3 border-b border-default px-2 py-2">
          <CommonAppLiveSearch
            v-model="q"
            class="w-56 shrink-0 sm:w-64"
            :placeholder="t('freight.ui.search')"
          />

          <div class="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
            <USelect
              v-for="filter in current.filters || []"
              :key="filter.key"
              :model-value="filters[filter.key] || undefined"
              :items="filterItems(filter)"
              :placeholder="fieldLabel(filter)"
              size="sm"
              class="w-40 shrink-0"
              :ui="getFilterSelectUi(isFilterValueActive(filters[filter.key]))"
              @update:model-value="filters[filter.key] = String($event || '')"
            />

            <CommonAppDateRangeFilter
              v-if="dateField"
              v-model:start="dateFrom"
              v-model:end="dateTo"
              granularity="day"
              class="shrink-0"
              :label="t('freight.ui.date')"
            />

            <template v-if="selectedIds.length && canMutate">
              <UButton
                :color="deactivationOnly ? 'warning' : 'error'"
                variant="soft"
                size="sm"
                :icon="deactivationOnly ? 'i-lucide-circle-off' : 'i-lucide-trash-2'"
                class="shrink-0"
                :label="`${deactivationOnly ? t('freight.ui.deactivate') : t('freight.ui.delete')} (${selectedIds.length})`"
                @click="deactivationOnly ? deactivateIds(selectedIds) : deleteIds(selectedIds)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="shrink-0"
                :label="t('freight.ui.clear')"
                @click="rowSelection = {}"
              />
            </template>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
          <UTable
            v-if="result.total"
            v-model:row-selection="rowSelection"
            v-model:pagination="pagination"
            :data="result.all"
            :columns="columns"
            :loading="pending"
            :get-row-id="(row: Record<string, unknown>) => String(row.id || '')"
            :pagination-options="paginationOptions"
            :virtualize="virtualize"
            sticky="header"
            class="freight-table h-full min-h-0"
            :ui="freightTableFillUi"
            @select="onRowSelect"
          />
          <UEmpty
            v-else
            variant="naked"
            icon="i-lucide-inbox"
            :title="t('freight.ui.noRecords')"
            :description="t('freight.ui.noRecordsHint')"
            :actions="canCreate ? [{ icon: 'i-lucide-plus', label: t('freight.ui.newEntity', { entity: moduleSingular(current) }), onClick: openCreate }] : []"
            class="py-16"
          />
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-default px-3 py-2">
          <USelect
            :model-value="String(pagination.pageSize)"
            :items="TABLE_PAGE_SIZES.map(value => ({ label: String(value), value: String(value) }))"
            size="xs"
            class="w-20"
            @update:model-value="setPageSize"
          />
          <div class="text-xs text-muted">
            <span v-if="selectedIds.length">{{ selectedIds.length }} {{ t('freight.ui.selected') }} · </span>
            {{ result.total }} {{ t('freight.ui.records') }}
          </div>
          <UPagination
            :page="pagination.pageIndex + 1"
            :items-per-page="pagination.pageSize"
            :total="result.total"
            @update:page="setPage"
          />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="grid h-full min-h-0 flex-1 place-items-center p-8">
    <UEmpty
      variant="naked"
      icon="i-lucide-unplug"
      :title="t('freight.ui.pageNotWired')"
      :description="t('freight.ui.pageNotWiredHint')"
    />
  </div>
</template>
