<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PaginationState } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { h } from 'vue'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { usePageSeo } from '~/composables/usePageSeo'
import { useFreightLabel } from '~/composables/freight/useFreight'
import { getFilterSelectUi, isFilterValueActive } from '~/utils/filter/select-ui'
import { buildGeneralLedger, filterGeneralLedger, type GeneralLedgerRow } from '~/utils/freight/general-ledger'
import { parsePageLimit, TABLE_PAGE_SIZES } from '~/utils/pagination'
import { freightTableUiReadonly } from '~/utils/table/theme'

const store = useFreightStore()
const { t, locale } = useI18n()
const { km } = useFreightLabel()
const { setTitle, clear } = useAppHeader()

setTitle(t('freight.pages.generalLedger'))
onBeforeUnmount(clear)
usePageSeo({ title: () => t('freight.pages.generalLedger') })

const q = ref('')
const account = ref('')
const voucherType = ref('')
const partyType = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 50 })
const tableScrollEl = ref<HTMLElement | null>(null)
const paginationOptions = { getPaginationRowModel: getPaginationRowModel() }

const allRows = computed(() => {
  store.hydrate()
  return buildGeneralLedger(store.collections)
})

const filtered = computed(() => filterGeneralLedger(allRows.value, {
  q: q.value,
  account: account.value,
  voucherType: voucherType.value,
  partyType: partyType.value,
  dateFrom: dateFrom.value,
  dateTo: dateTo.value,
}))

const totals = computed(() => filtered.value.reduce(
  (acc, row) => ({
    debit: acc.debit + row.debit,
    credit: acc.credit + row.credit,
  }),
  { debit: 0, credit: 0 },
))

const accountItems = computed(() => [...new Set(allRows.value.map(row => row.account))]
  .sort()
  .map(value => ({ label: value, value })))

const voucherTypeItems = computed(() => [...new Set(allRows.value.map(row => row.voucherType))]
  .sort()
  .map(value => ({ label: value, value })))

const partyTypeItems = [
  { label: 'Customer', value: 'Customer' },
  { label: 'Supplier', value: 'Supplier' },
]

function formatAmount(value: number) {
  if (!value) return ''
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const columns = computed<TableColumn<GeneralLedgerRow>[]>(() => {
  const label = (en: string, kmLabel: string) => (locale.value === 'km' ? kmLabel : en)
  return [
    { accessorKey: 'postingDate', header: label('Posting Date', 'កាលបរិច្ឆេទ'), enableSorting: false },
    { accessorKey: 'account', header: label('Account', 'គណនី'), enableSorting: false },
    {
      accessorKey: 'debit',
      header: () => h('span', { class: 'block w-full text-right' }, label('Debit (USD)', 'ឥណពន្ធ')),
      enableSorting: false,
      meta: { class: { th: 'text-right', td: 'text-right tabular-nums' } },
      cell: ({ row }) => formatAmount(row.original.debit),
    },
    {
      accessorKey: 'credit',
      header: () => h('span', { class: 'block w-full text-right' }, label('Credit (USD)', 'ឥណទាន')),
      enableSorting: false,
      meta: { class: { th: 'text-right', td: 'text-right tabular-nums' } },
      cell: ({ row }) => formatAmount(row.original.credit),
    },
    {
      accessorKey: 'balance',
      header: () => h('span', { class: 'block w-full text-right' }, label('Balance (USD)', 'សមតុល្យ')),
      enableSorting: false,
      meta: { class: { th: 'text-right', td: 'text-right tabular-nums font-medium' } },
      cell: ({ row }) => formatAmount(row.original.balance),
    },
    { accessorKey: 'voucherType', header: label('Voucher Type', 'ប្រភេទប័ណ្ណ'), enableSorting: false },
    { accessorKey: 'voucherNo', header: label('Voucher No', 'លេខប័ណ្ណ'), enableSorting: false },
    { accessorKey: 'againstAccount', header: label('Against Account', 'គណនីទាក់ទង'), enableSorting: false },
    { accessorKey: 'partyType', header: label('Party Type', 'ប្រភេទ'), enableSorting: false },
    { accessorKey: 'party', header: label('Party', 'ភាគី'), enableSorting: false },
    { accessorKey: 'jobNo', header: label('Job', 'ការងារ'), enableSorting: false },
  ]
})

watch([q, account, voucherType, partyType, dateFrom, dateTo], () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
})

function refresh() {
  store.hydrate()
}

function setPageSize(value: unknown) {
  pagination.value = { pageIndex: 0, pageSize: parsePageLimit(value, 50) }
}

function setPage(page: number) {
  pagination.value = { ...pagination.value, pageIndex: Math.max(0, page - 1) }
}

function clearFilters() {
  q.value = ''
  account.value = ''
  voucherType.value = ''
  partyType.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
    <LayoutAppHeaderPageActions :can-create="false" @refresh="refresh" />

    <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-1.5 pt-1.5 pb-0">
      <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-default bg-default shadow-xs">
        <div class="flex items-center gap-3 border-b border-default px-2 py-2">
          <CommonAppLiveSearch
            v-model="q"
            class="w-56 shrink-0 sm:w-64"
            :placeholder="km ? 'ស្វែងរកគណនី, ភាគី, ប័ណ្ណ...' : 'Search account, party, voucher...'"
          />

          <div class="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
            <USelect
              :model-value="account || undefined"
              :items="accountItems"
              :placeholder="km ? 'គណនី' : 'Account'"
              size="sm"
              class="w-44 shrink-0"
              :ui="getFilterSelectUi(isFilterValueActive(account))"
              @update:model-value="account = String($event || '')"
            />
            <USelect
              :model-value="voucherType || undefined"
              :items="voucherTypeItems"
              :placeholder="km ? 'ប្រភេទប័ណ្ណ' : 'Voucher Type'"
              size="sm"
              class="w-40 shrink-0"
              :ui="getFilterSelectUi(isFilterValueActive(voucherType))"
              @update:model-value="voucherType = String($event || '')"
            />
            <USelect
              :model-value="partyType || undefined"
              :items="partyTypeItems"
              :placeholder="km ? 'ប្រភេទភាគី' : 'Party Type'"
              size="sm"
              class="w-36 shrink-0"
              :ui="getFilterSelectUi(isFilterValueActive(partyType))"
              @update:model-value="partyType = String($event || '')"
            />
            <CommonAppDateRangeFilter
              v-model:start="dateFrom"
              v-model:end="dateTo"
              granularity="day"
              class="shrink-0"
              :label="km ? 'កាលបរិច្ឆេទ' : 'Date'"
            />
            <UButton
              v-if="q || account || voucherType || partyType || dateFrom || dateTo"
              color="neutral"
              variant="ghost"
              size="sm"
              class="shrink-0"
              :label="km ? 'សម្អាត' : 'Clear'"
              @click="clearFilters"
            />
          </div>
        </div>

        <div ref="tableScrollEl" class="min-h-0 flex-1 overflow-auto p-2">
          <UTable
            v-model:pagination="pagination"
            :data="filtered"
            :columns="columns"
            :get-row-id="(row: GeneralLedgerRow) => row.id"
            :pagination-options="paginationOptions"
            sticky="header"
            class="freight-table min-w-max"
            :ui="freightTableUiReadonly"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-3 py-2">
          <USelect
            :model-value="String(pagination.pageSize)"
            :items="TABLE_PAGE_SIZES.map(value => ({ label: String(value), value: String(value) }))"
            size="xs"
            class="w-20"
            @update:model-value="setPageSize"
          />
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>{{ filtered.length }} {{ km ? 'ជួរគណនី' : 'entries' }}</span>
            <span>{{ km ? 'ឥណពន្ធ' : 'Debit' }}: <strong class="text-highlighted">{{ formatAmount(totals.debit) || '0.00' }}</strong></span>
            <span>{{ km ? 'ឥណទាន' : 'Credit' }}: <strong class="text-highlighted">{{ formatAmount(totals.credit) || '0.00' }}</strong></span>
          </div>
          <UPagination
            :page="pagination.pageIndex + 1"
            :items-per-page="pagination.pageSize"
            :total="filtered.length"
            @update:page="setPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>
