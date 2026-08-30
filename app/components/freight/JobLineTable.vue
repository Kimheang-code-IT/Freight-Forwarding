<script setup lang="ts">
import type { FreightTable } from '~/config/freight-modules'

defineProps<{
  table: FreightTable
  modelValue: Array<Record<string, unknown>>
  disabled?: boolean
  viewOnlyActions?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [Array<Record<string, unknown>>]
  'rowAction': [action: 'view', row: Record<string, unknown>]
}>()
</script>

<template>
  <TableAppLineTable
    :table="table"
    :model-value="modelValue"
    :disabled="disabled"
    :view-only-actions="viewOnlyActions"
    @update:model-value="emit('update:modelValue', $event)"
    @row-action="(action, row) => emit('rowAction', action, row)" />
</template>
