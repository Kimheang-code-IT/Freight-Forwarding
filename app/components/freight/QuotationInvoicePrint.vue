<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FreightRecord } from '~/config/freight-seed'
import { expandQuotationContainerSlots, type QuotationContainerSlot } from '~/utils/freight/quotation-print'
import { freightTableUiCompact } from '~/utils/table/theme'

const props = defineProps<{
  record: FreightRecord
  disabled?: boolean
}>()

const { t } = useI18n()

const quotationId = computed(() => String(props.record.id || ''))
const containers = computed(() => expandQuotationContainerSlots(props.record))

function previewUrl(template: 'tax-invoice' | 'debit-note', containerIndex?: number) {
  const query: Record<string, string> = { template }
  if (template === 'debit-note' && containerIndex !== undefined) {
    query.container = String(containerIndex)
  }
  return {
    path: `/print/quotations/${quotationId.value}`,
    query,
  }
}

async function openPreview(template: 'tax-invoice' | 'debit-note', containerIndex?: number) {
  if (!quotationId.value || props.disabled) return
  await navigateTo(previewUrl(template, containerIndex))
}

const columns = computed<TableColumn<QuotationContainerSlot>[]>(() => [
  {
    accessorKey: 'label',
    header: t('freight.print.quotation.container'),
    enableSorting: false,
  },
  {
    accessorKey: 'containerType',
    header: t('freight.print.fields.containerType'),
    enableSorting: false,
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { class: { td: 'text-end', th: 'text-end' } },
    cell: ({ row }) => h(resolveComponent('UButton'), {
      color: 'neutral',
      variant: 'outline',
      size: 'xs',
      icon: 'i-lucide-file-credit-card',
      label: t('freight.print.preview'),
      disabled: props.disabled || !quotationId.value,
      onClick: () => openPreview('debit-note', row.original.index),
    }),
  },
])
</script>

<template>
  <div class="space-y-4 md:col-span-2">
    <UCard :ui="{ body: 'p-4 space-y-3' }">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-medium text-highlighted">
            {{ t('freight.print.quotation.taxInvoiceTitle') }}
          </p>
          <p class="text-xs text-muted">
            {{ t('freight.print.quotation.taxInvoiceHint') }}
          </p>
        </div>
        <UButton
          color="primary"
          size="sm"
          icon="i-lucide-receipt-percent"
          :label="t('freight.print.preview')"
          :disabled="disabled || !quotationId"
          @click="openPreview('tax-invoice')"
        />
      </div>
    </UCard>

    <UCard :ui="{ body: 'p-0' }">
      <div class="border-b border-default px-4 py-3">
        <p class="text-sm font-medium text-highlighted">
          {{ t('freight.print.quotation.debitNoteTitle') }}
        </p>
        <p class="text-xs text-muted">
          {{ t('freight.print.quotation.debitNoteHint') }}
        </p>
      </div>

      <div v-if="!containers.length" class="px-4 py-6 text-sm text-muted">
        {{ t('freight.print.quotation.noContainers') }}
      </div>

      <div v-else class="overflow-x-auto">
        <UTable
          :data="containers"
          :columns="columns"
          :get-row-id="(row: QuotationContainerSlot) => String(row.index)"
          class="freight-table freight-table-compact min-w-full"
          :ui="freightTableUiCompact"
        />
      </div>
    </UCard>
  </div>
</template>
