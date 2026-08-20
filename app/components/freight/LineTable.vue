<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { FreightTable } from '~/config/freight-modules'
import { useFreightLabel } from '~/composables/freight/useFreight'
import { freightTableUiReadonly } from '~/utils/table/theme'

const props = defineProps<{
  table: FreightTable
  modelValue: Array<Record<string, unknown>>
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [Array<Record<string, unknown>>]
}>()

const { fieldLabel, km } = useFreightLabel()
const UButton = resolveComponent('UButton')
const UInput = resolveComponent('UInput')
const UInputNumber = resolveComponent('UInputNumber')
const USelect = resolveComponent('USelect')

const rows = computed({
  get: () => props.modelValue || [],
  set: value => emit('update:modelValue', value),
})

const tableRows = computed(() => rows.value.map((row, index) => ({ ...row, _rowIndex: index })))

function updateCell(index: number, key: string, value: unknown) {
  const next = rows.value.map((row, i) => i === index ? { ...row, [key]: value } : row)
  if (props.table.key === 'otherCharges') {
    const row = next[index]
    if (!row) return
    const qty = Number(row.quantity || 0)
    const selling = Number(row.sellingRate || 0)
    next[index] = { ...row, amount: qty * selling }
  }
  rows.value = next
}

function addRow() {
  const blank = Object.fromEntries(props.table.columns.map(column => [column.key, column.type === 'number' ? 0 : '']))
  rows.value = [...rows.value, blank]
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, i) => i !== index)
}

const columns = computed<TableColumn<Record<string, unknown>>[]>(() => {
  const cols: TableColumn<Record<string, unknown>>[] = [
    {
      id: 'rowNumber',
      header: '#',
      cell: ({ row }) => Number(row.original._rowIndex || 0) + 1,
      enableSorting: false,
    },
    ...props.table.columns.map(column => ({
      accessorKey: column.key,
      header: fieldLabel(column),
      enableSorting: false,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const index = Number(row.original._rowIndex || 0)
        if (column.type === 'select') {
          return h(USelect, {
            'modelValue': String(row.original[column.key] || '') || undefined,
            'items': (column.options || []).filter(Boolean).map(option => ({ label: option, value: option })),
            'disabled': props.disabled,
            'size': 'sm',
            'class': 'w-full min-w-40',
            'onUpdate:modelValue': (value: unknown) => updateCell(index, column.key, value),
          })
        }
        if (column.type === 'number') {
          return h(UInputNumber, {
            'modelValue': Number(row.original[column.key] || 0),
            'disabled': props.disabled,
            'size': 'sm',
            'class': 'w-full min-w-28',
            'onUpdate:modelValue': (value: number | null) => updateCell(index, column.key, value ?? 0),
          })
        }
        return h(UInput, {
          'modelValue': String(row.original[column.key] ?? ''),
          'disabled': props.disabled,
          'size': 'sm',
          'class': 'w-full min-w-36',
          'onUpdate:modelValue': (value: string) => updateCell(index, column.key, value),
        })
      },
    })),
  ]
  if (!props.disabled) {
    cols.push({
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => h(UButton, {
        icon: 'i-lucide-trash-2',
        color: 'error',
        variant: 'ghost',
        size: 'xs',
        square: true,
        onClick: () => removeRow(Number(row.original._rowIndex || 0)),
      }),
    })
  }
  return cols
})
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium text-highlighted">
        {{ km && table.titleKm ? table.titleKm : table.title }}
      </h3>
      <UButton
        v-if="!disabled"
        size="xs"
        color="neutral"
        variant="soft"
        icon="i-lucide-plus"
        :label="table.addLabel || 'Add row'"
        @click="addRow"
      />
    </div>
    <UTable
      :data="tableRows"
      :columns="columns"
      :get-row-id="(row: Record<string, unknown>) => String(row._rowIndex ?? '')"
      class="freight-table min-w-max"
      :ui="freightTableUiReadonly"
    />
  </section>
</template>
