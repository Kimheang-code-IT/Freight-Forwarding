<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { FreightRecord } from '~/config/freight-seed'
import { formatFreightCell, statusColor } from '~/composables/freight/useFreight'
import { isNumericKey, jobWorkspacePath } from '~/utils/freight/job-workspace'
import { freightTableUi } from '~/utils/table/theme'

export type JobRelatedColumn = {
  key: string
  label: string
  money?: boolean
  status?: boolean
}

const props = withDefaults(defineProps<{
  rows: FreightRecord[]
  columns: JobRelatedColumn[]
  emptyTitle: string
  emptyDescription?: string
  emptyIcon?: string
  recordPath?: (row: FreightRecord) => string | undefined
  jobLink?: boolean
}>(), {
  emptyIcon: 'i-lucide-inbox',
  jobLink: true,
})

const UBadge = resolveComponent('UBadge')
const ULink = resolveComponent('ULink')
const store = useFreightStore()

function jobPath(jobNo: unknown) {
  const job = store.getJobByNo(String(jobNo || ''))
  return job ? jobWorkspacePath(job.id) : undefined
}

const tableColumns = computed<TableColumn<FreightRecord>[]>(() =>
  props.columns.map((column, index) => ({
    accessorKey: column.key,
    header: column.label,
    enableSorting: false,
    meta: isNumericKey(column.key) || column.money
      ? { class: { td: 'text-end tabular-nums whitespace-nowrap', th: 'text-end' } }
      : undefined,
    cell: ({ row }: { row: { original: FreightRecord } }) => {
      const raw = row.original[column.key]
      const text = formatFreightCell(raw, column.key)
      if (column.status || column.key === 'status' || column.key.toLowerCase().includes('status')) {
        return h(UBadge, { color: statusColor(String(raw || '')), variant: 'subtle' }, () => text)
      }
      if (column.key === 'jobNo' && props.jobLink) {
        const to = jobPath(raw)
        if (to) {
          return h(ULink, {
            to,
            class: 'font-medium text-highlighted hover:text-primary hover:underline',
          }, () => text)
        }
      }
      if (index === 0 && props.recordPath) {
        const to = props.recordPath(row.original)
        if (to) {
          return h(ULink, {
            to,
            class: 'font-medium text-highlighted hover:text-primary hover:underline',
          }, () => text)
        }
      }
      return h('span', { class: isNumericKey(column.key) || column.money ? 'tabular-nums' : '' }, text)
    },
  })),
)

function onSelect(_event: Event, row: TableRow<FreightRecord>) {
  const to = props.recordPath?.(row.original)
  if (to) navigateTo(to)
}
</script>

<template>
  <div v-if="rows.length" class="overflow-hidden rounded-md border border-default">
    <div class="overflow-x-auto">
      <UTable
        :data="rows"
        :columns="tableColumns"
        :get-row-id="(row: FreightRecord) => String(row.id || '')"
        class="freight-table min-w-max"
        :ui="freightTableUi"
        @select="onSelect"
      />
    </div>
  </div>
  <FreightJobEmptyState
    v-else
    :title="emptyTitle"
    :description="emptyDescription"
    :icon="emptyIcon"
  />
</template>
