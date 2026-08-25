<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { DOCUMENT_STATUS } from '~/config/freight-options'
import { freightTableUiReadonly } from '~/utils/table/theme'

const props = defineProps<{
  modelValue: Array<Record<string, unknown>>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [Array<Record<string, unknown>>]
}>()

const UCheckbox = resolveComponent('UCheckbox')
const UInput = resolveComponent('UInput')
const USelect = resolveComponent('USelect')

function update(index: number, key: string, value: unknown) {
  emit('update:modelValue', props.modelValue.map((row, i) => i === index ? { ...row, [key]: value } : row))
}

function checklistStatus(value: unknown): typeof DOCUMENT_STATUS[number] {
  const status = String(value || 'Missing')
  return DOCUMENT_STATUS.find(item => item === status) || 'Missing'
}

const tableRows = computed(() => props.modelValue.map((row, index) => ({ ...row, _rowIndex: index })))

const columns = computed<TableColumn<Record<string, unknown>>[]>(() => [
  {
    accessorKey: 'type',
    header: 'Document',
    enableSorting: false,
  },
  {
    id: 'required',
    header: 'Required',
    enableSorting: false,
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': Boolean(row.original.required),
      'disabled': props.disabled,
      'aria-label': `Required ${String(row.original.type || '')}`,
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => update(Number(row.original._rowIndex), 'required', value === true),
    }),
  },
  {
    id: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => h(USelect, {
      'modelValue': checklistStatus(row.original.status),
      'items': DOCUMENT_STATUS.map(status => ({ label: status, value: status })),
      'disabled': props.disabled,
      'size': 'sm',
      'class': 'min-w-40',
      'onUpdate:modelValue': (value: unknown) => update(Number(row.original._rowIndex), 'status', value),
    }),
  },
  {
    id: 'remark',
    header: 'Remark',
    enableSorting: false,
    cell: ({ row }) => h(UInput, {
      'modelValue': String(row.original.remark || ''),
      'disabled': props.disabled,
      'size': 'sm',
      'onUpdate:modelValue': (value: string) => update(Number(row.original._rowIndex), 'remark', value),
    }),
  },
])
</script>

<template>
  <UTable
    :data="tableRows"
    :columns="columns"
    :get-row-id="(row: Record<string, unknown>) => String(row.type || row._rowIndex || '')"
    class="freight-table min-w-max"
    :ui="freightTableUiReadonly"
  />
</template>
