<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { usePageSeo } from '~/composables/usePageSeo'
import { statusColor, useFreightLabel } from '~/composables/freight/useFreight'
import { freightTableUi } from '~/utils/table/theme'

const store = useFreightStore()
const { t, locale } = useI18n()
const { km } = useFreightLabel()
const { setTitle, clear } = useAppHeader()
const UBadge = resolveComponent('UBadge')

setTitle(t('freight.pages.dashboard'))
onBeforeUnmount(clear)
usePageSeo({ title: () => t('freight.pages.dashboard') })

const data = computed(() => store.dashboard)
const summaryKpis = computed(() => (data.value?.kpis || []).slice(0, 10))
const recentColumns = [
  ['jobNo', 'Job No.', 'លេខការងារ'],
  ['date', 'Date', 'កាលបរិច្ឆេទ'],
  ['customer', 'Customer / Factory', 'អតិថិជន / រោងចក្រ'],
  ['direction', 'Import / Export', 'នាំចូល / នាំចេញ'],
  ['containerNo', 'Container No.', 'លេខកុងតឺន័រ'],
  ['containerType', 'Container Size', 'ទំហំ'],
  ['etaFactory', 'ETA', 'ម៉ោងមកដល់'],
  ['status', 'Status', 'ស្ថានភាព'],
] as const

const columns = computed<TableColumn<Record<string, unknown>>[]>(() =>
  recentColumns.map(column => ({
    accessorKey: column[0],
    header: locale.value === 'km' ? column[2] : column[1],
    enableSorting: false,
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const value = row.original[column[0]]
      if (column[0] === 'status' || column[0] === 'direction') {
        return h(UBadge, {
          color: column[0] === 'status' ? statusColor(String(value || '')) : 'info',
          variant: 'subtle',
        }, () => String(value || '—'))
      }
      return String(value || '—')
    },
  })),
)

function openJob(_event: Event, row: TableRow<Record<string, unknown>>) {
  navigateTo(`/operations/jobs/${row.original.id}`)
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/20">
    <LayoutAppHeaderPageActions :can-create="false" @refresh="store.hydrate()" />

    <div class="flex w-full min-w-0 flex-1 flex-col gap-3 px-1.5 pt-1.5 pb-3">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <CommonAppSummaryCard
          v-for="kpi in summaryKpis"
          :key="kpi.id"
          :title="locale === 'km' ? kpi.labelKm : kpi.label"
          :value="kpi.value"
          :to="kpi.to"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 xl:grid-cols-1">
        <section class="overflow-hidden rounded-md border border-default bg-default">
          <div class="flex items-center justify-between border-b border-default px-4 py-3">
            <h2 class="text-sm font-semibold text-highlighted">{{ km ? 'ការងារថ្មីៗ' : 'Recent Jobs' }}</h2>
            <UButton size="xs" variant="ghost" to="/operations/jobs" trailing-icon="i-lucide-arrow-up-right">
              {{ km ? 'មើលទាំងអស់' : 'View all' }}
            </UButton>
          </div>
          <div class="overflow-x-auto p-2">
            <UTable
              :data="data.recentJobs"
              :columns="columns"
              :get-row-id="(row: Record<string, unknown>) => String(row.id || '')"
              class="freight-table min-w-max"
              :ui="freightTableUi"
              @select="openJob"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
