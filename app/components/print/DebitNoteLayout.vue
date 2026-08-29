<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PrintViewModel } from '~/utils/freight/print-model'
import { useAppLocalization } from '~/composables/settings/useAppLocalization'
import { DEBIT_NOTE_APPROVAL_SLOTS } from '~/config/print-templates'

const props = defineProps<{
  model: PrintViewModel
  printDate: string
  printUser: string
}>()

const { t } = useI18n()
const { formatDate, formatMoney, formatNumber } = useAppLocalization()

const money = (value: number) => formatMoney(value, props.model.totals.currency)

type Row = Record<string, string>

const rows = computed<Row[]>(() => {
  const lineRows = props.model.lines.map(line => ({
    reference: line.reference || '-',
    description: line.description || '',
    quantity: line.quantity ? formatNumber(line.quantity, { maximumFractionDigits: 2 }) : '',
    unit: line.unit,
    unitPrice: line.unitPrice ? money(line.unitPrice) : '',
    currency: props.model.totals.currency,
    debit: line.debit ? money(line.debit) : '',
    credit: line.credit ? money(line.credit) : '',
  }))
  lineRows.push({
    reference: '',
    description: t('freight.print.fields.total'),
    quantity: '',
    unit: '',
    unitPrice: '',
    currency: '',
    debit: money(props.model.totals.totalDebit),
    credit: money(props.model.totals.totalCredit),
  })
  return lineRows
})

const columns = computed<TableColumn<Row>[]>(() => [
  { accessorKey: 'reference', header: t('freight.print.fields.referenceNo'), meta: { class: { td: 'w-22', th: 'w-22' } } },
  { accessorKey: 'description', header: t('freight.print.fields.description') },
  { accessorKey: 'quantity', header: t('freight.print.fields.quantity'), meta: { class: { td: 'text-end tabular-nums w-12', th: 'text-end w-12' } } },
  { accessorKey: 'unit', header: t('freight.print.fields.unit'), meta: { class: { td: 'w-12', th: 'w-12' } } },
  { accessorKey: 'unitPrice', header: t('freight.print.fields.unitPrice'), meta: { class: { td: 'text-end tabular-nums w-20', th: 'text-end w-20' } } },
  { accessorKey: 'currency', header: t('freight.print.fields.currency'), meta: { class: { td: 'w-12 text-center', th: 'w-12 text-center' } } },
  { accessorKey: 'debit', header: t('freight.print.fields.debit'), meta: { class: { td: 'text-end tabular-nums w-20', th: 'text-end w-20' } } },
  { accessorKey: 'credit', header: t('freight.print.fields.credit'), meta: { class: { td: 'text-end tabular-nums w-20', th: 'text-end w-20' } } },
])

const metaItems = computed(() => [
  { label: t('freight.print.fields.debitNoteNo'), value: props.model.document.number, strong: true },
  { label: t('freight.print.fields.billingDate'), value: props.model.document.issueDate ? formatDate(props.model.document.issueDate) : '' },
  { label: t('freight.print.fields.dueDate'), value: props.model.document.dueDate ? formatDate(props.model.document.dueDate) : '' },
  { label: t('freight.print.fields.personInCharge'), value: props.model.document.personInCharge },
  { label: t('freight.print.fields.telNo'), value: props.model.party.phone },
  { label: t('freight.print.fields.email'), value: props.model.party.email },
])

const shipmentItems = computed(() => [
  { label: t('freight.print.fields.workNo'), value: props.model.shipment.workNo },
  { label: t('freight.print.fields.houseNo'), value: props.model.shipment.houseNo },
  { label: t('freight.print.fields.masterNo'), value: props.model.shipment.masterNo },
  { label: t('freight.print.fields.blNo'), value: props.model.shipment.blNo },
  { label: t('freight.print.fields.loadingPort'), value: props.model.shipment.loadingPort },
  { label: t('freight.print.fields.dischargePort'), value: props.model.shipment.dischargePort },
  { label: t('freight.print.fields.etd'), value: props.model.shipment.etd ? formatDate(props.model.shipment.etd) : '' },
  { label: t('freight.print.fields.eta'), value: props.model.shipment.eta ? formatDate(props.model.shipment.eta) : '' },
  { label: t('freight.print.fields.vessel'), value: props.model.shipment.vessel },
  { label: t('freight.print.fields.voyage'), value: props.model.shipment.voyage },
  { label: t('freight.print.fields.containerNo'), value: props.model.shipment.containerNo },
  { label: t('freight.print.fields.containerType'), value: props.model.shipment.containerType },
  { label: t('freight.print.fields.package'), value: [props.model.shipment.packageQty, props.model.shipment.packageUnit].filter(Boolean).join(' ') },
  { label: t('freight.print.fields.invoiceDate'), value: props.model.document.issueDate ? formatDate(props.model.document.issueDate) : '' },
])

const partyItems = computed(() => [
  { label: t('freight.print.fields.shipper'), value: props.model.shipment.shipper },
  { label: t('freight.print.fields.consignee'), value: props.model.shipment.consignee },
  { label: t('freight.print.fields.notifyParty'), value: props.model.shipment.notifyParty },
])

const showShipParties = computed(() => partyItems.value.some(item => item.value))
const approvalSlots = computed(() => DEBIT_NOTE_APPROVAL_SLOTS.map(key => ({ caption: t(key) })))
</script>

<template>
  <div class="print-paper print-paper--portrait">
    <header class="space-y-3">
      <PrintIssuerHeader :issuer="model.issuer" class="!w-auto" />
    </header>

    <h1 class="my-4 text-center text-2xl font-bold tracking-wide text-gray-900">
      {{ t('freight.print.title.debitNote') }}
    </h1>

    <PrintSignatureBlock v-if="DEBIT_NOTE_APPROVAL_SLOTS.length" :slots="approvalSlots" class="mb-4 !text-[10px]" />

    <section class="mb-3 flex flex-wrap items-start justify-between gap-6">
      <PrintPartyBlock
        label-key="freight.print.fields.partner"
        :party="model.party"
        class="min-w-[80mm] flex-1"
      />
      <PrintMetaGrid class="min-w-[70mm] flex-1" :items="metaItems" />
    </section>

    <section class="mb-3 space-y-2">
      <PrintMetaGrid :items="shipmentItems" :columns="2" />
      <PrintMetaGrid v-if="showShipParties" :items="partyItems" :columns="2" />
    </section>

    <PrintLinesTable :columns="columns" :rows="rows" />

    <section class="mt-3 space-y-2">
      <div class="ml-auto w-[80mm] space-y-1 text-[11px] text-gray-900">
        <div class="grid grid-cols-[1fr_30mm] items-baseline gap-x-2 font-semibold">
          <span>{{ t('freight.print.fields.balanceAmount') }} {{ model.totals.currency }}</span>
          <span class="text-right tabular-nums">{{ money(model.totals.balance) }}</span>
        </div>
        <p class="text-[10px] italic text-gray-700">{{ model.amountInWords }}</p>
      </div>
      <p v-if="model.document.remarks" class="text-[11px] text-gray-900">
        <span class="font-semibold">{{ t('freight.print.fields.remarks') }}: </span>{{ model.document.remarks }}
      </p>
    </section>

    <section class="mt-4 flex flex-wrap items-start justify-between gap-6">
      <PrintBankBlock
        v-if="model.settlement.accountName || model.settlement.bankName"
        :settlement="model.settlement"
        :title="t('freight.print.fields.bankInfo')"
      />
      <div class="text-center text-[11px] text-gray-900">
        <p class="mb-1 font-semibold">{{ t('freight.print.fields.signedBy') }}</p>
        <div class="w-[42mm] border-b border-gray-800" aria-hidden="true" />
      </div>
    </section>

    <PrintFooterBar
      :document-number="model.document.number"
      :print-date="props.printDate"
      :print-user="props.printUser"
    />
  </div>
</template>

<style>
@page debitNote {
  size: A4 portrait;
  margin: 12mm 12mm 14mm;
}
</style>

<style scoped>
.print-paper {
  page: debitNote;
}
</style>
