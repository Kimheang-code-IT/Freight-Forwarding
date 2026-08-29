<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const props = defineProps<{
  columns: TableColumn<Record<string, string>>[]
  rows: Array<Record<string, string>>
}>()

const tableUi = {
  root: 'overflow-visible',
  base: 'min-w-full border-collapse',
  thead: '',
  tbody: 'divide-y-0',
  tr: '',
  th: 'border border-gray-300 bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-900',
  td: 'border border-gray-300 px-2 py-1 text-[11px] text-gray-900 whitespace-normal',
}
</script>

<template>
  <UTable
    :data="props.rows"
    :columns="props.columns"
    :ui="tableUi"
    class="print-table"
  />
</template>

<style scoped>
:deep(table) {
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
</style>
