<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import type { FreightRelated } from '~/config/freight-modules'
import type { FreightRecord } from '~/config/freight-seed'
import { useFreightLabel } from '~/composables/freight/useFreight'
import { freightTableUi } from '~/utils/table/theme'

const props = defineProps<{
  groups: Array<FreightRelated & { rows: FreightRecord[] }>
}>()

const { km } = useFreightLabel()

function titleOf(row: FreightRecord) {
  return String(row.jobNo || row.quotationNo || row.debitNoteNo || row.documentNo || row.paymentNo || row.name || row.id)
}

const columns = computed<TableColumn<FreightRecord>[]>(() => [
  {
    id: 'title',
    header: km.value ? 'កំណត់ត្រា' : 'Record',
    accessorFn: row => titleOf(row),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: km.value ? 'ស្ថានភាព' : 'Status',
    enableSorting: false,
    cell: ({ row }) => String(row.original.status || row.original.containerNo || row.original.date || '—'),
  },
])

function openRelated(path: string) {
  return (_event: Event, row: TableRow<FreightRecord>) => {
    navigateTo(`${path}/${row.original.id}`)
  }
}
</script>

<template>
  <div class="space-y-6">
    <section v-for="group in groups" :key="group.path" class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-highlighted">{{ km && group.titleKm ? group.titleKm : group.title }}</h3>
        <UButton size="xs" color="neutral" variant="ghost" :to="group.path" trailing-icon="i-lucide-arrow-up-right">
          View all
        </UButton>
      </div>
      <UTable
        v-if="group.rows.length"
        :data="group.rows.slice(0, 20)"
        :columns="columns"
        :get-row-id="(row: FreightRecord) => row.id"
        class="freight-table min-w-max"
        :ui="freightTableUi"
        @select="openRelated(group.path)"
      />
      <div v-else class="rounded-md border border-dashed border-default px-3 py-4 text-sm text-muted">
        No related records.
      </div>
    </section>
  </div>
</template>
