<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PrintViewModel } from '~/utils/freight/print-model'
import { printOrDash } from '~/utils/freight/print-model'
import { useAppLocalization } from '~/composables/settings/useAppLocalization'

const props = defineProps<{
  model: PrintViewModel
  printDate: string
  printUser: string
}>()

const { t } = useI18n()
const { formatDate, formatMoney, formatNumber } = useAppLocalization()

/** Bilingual (Khmer / English) label for the tax invoice reference layout. */
function bi(key: string): string {
  let khmer = ''
  try {
    khmer = t(key, {}, { locale: 'km' })
  }
  catch {
    khmer = ''
  }
  const english = t(key)
  return khmer && khmer !== key ? `${khmer}\n${english}` : english
}

const money = (value: number) => formatMoney(value, props.model.totals.currency)

type Row = Record<string, string>

const rows = computed<Row[]>(() => props.model.lines.map(line => ({
  no: String(line.no),
  description: line.description || '-',
  quantity: line.quantity ? formatNumber(line.quantity, { maximumFractionDigits: 2 }) : '',
  unitPrice: line.unitPrice ? money(line.unitPrice) : '',
  amount: line.amount ? money(line.amount) : '',
})))

const columns = computed<TableColumn<Row>[]>(() => [
  { accessorKey: 'no', header: bi('freight.print.fields.lineNo'), meta: { class: { td: 'text-center w-8', th: 'text-center w-8' } } },
  { accessorKey: 'description', header: bi('freight.print.fields.description') },
  { accessorKey: 'quantity', header: bi('freight.print.fields.quantity'), meta: { class: { td: 'text-end tabular-nums w-16', th: 'text-end w-16' } } },
  { accessorKey: 'unitPrice', header: bi('freight.print.fields.unitPrice'), meta: { class: { td: 'text-end tabular-nums w-24', th: 'text-end w-24' } } },
  { accessorKey: 'amount', header: bi('freight.print.fields.amount'), meta: { class: { td: 'text-end tabular-nums w-28', th: 'text-end w-28' } } },
])

const totalsItems = computed(() => {
  const totals = props.model.totals
  const items = [
    { label: `${bi('freight.print.fields.subTotal')} (${totals.currency})`, value: money(totals.subtotal), strong: false },
  ]
  if (totals.taxRate > 0 || totals.taxAmount > 0) {
    items.push({
      label: `${bi('freight.print.fields.vat')} @${printOrDash(totals.taxRate ? formatNumber(totals.taxRate) : '')}% (${totals.currency})`,
      value: money(totals.taxAmount),
      strong: false,
    })
  }
  items.push({ label: `${bi('freight.print.fields.grandTotal')} (${totals.currency})`, value: money(totals.grandTotal), strong: true })
  if (totals.exchangeRate > 0 && totals.localCurrency !== totals.currency) {
    items.push({ label: `${bi('freight.print.fields.grandTotalLocal')} (${totals.localCurrency})`, value: formatMoney(totals.grandTotalLocal, totals.localCurrency), strong: false })
  }
  return items
})

const customerItems = computed(() => [
  { label: bi('freight.print.fields.invoiceNo'), value: props.model.document.number },
  { label: bi('freight.print.fields.invoiceDate'), value: props.model.document.issueDate ? formatDate(props.model.document.issueDate) : '' },
])
</script>

<template>
  <div class="print-paper print-paper--landscape">
    <header class="space-y-2">
      <PrintIssuerHeader :issuer="model.issuer" show-khmer />
      <hr class="border-gray-800">
    </header>

    <h1 class="my-4 text-center text-xl font-bold text-gray-900">
      <span class="block">{{ t('freight.print.title.taxInvoice', 1, { locale: 'km' }) }}</span>
      <span class="block">{{ t('freight.print.title.taxInvoice') }}</span>
    </h1>

    <section class="mb-4 flex flex-wrap items-start justify-between gap-6">
      <PrintPartyBlock label-key="freight.print.fields.customer" :party="model.party" show-phone />
      <PrintMetaGrid class="min-w-[60mm]" :items="customerItems" />
    </section>

    <PrintLinesTable :columns="columns" :rows="rows" />

    <section class="mt-4 flex flex-wrap items-start justify-between gap-6">
      <PrintBankBlock
        v-if="model.settlement.accountName || model.settlement.bankName"
        :settlement="model.settlement"
        :title="t('freight.print.fields.bankInfo')"
      />
      <PrintTotalsBlock :items="totalsItems" />
    </section>

    <p v-if="model.totals.exchangeRate > 0" class="mt-2 text-right text-[10px] text-gray-600">
      {{ bi('freight.print.fields.exchangeRate') }}: {{ formatNumber(model.totals.exchangeRate, { maximumFractionDigits: 4 }) }}
    </p>

    <footer class="mt-8">
      <PrintSignatureBlock
        :slots="[
          { caption: t('freight.print.fields.customerSignature') },
          { caption: t('freight.print.fields.sellerSignature') },
        ]"
      />
    </footer>

    <PrintFooterBar
      :document-number="model.document.number"
      :print-date="props.printDate"
      :print-user="props.printUser"
    />
  </div>
</template>

<style>
/* Named page keeps the landscape orientation scoped to this template only. */
@page taxInvoice {
  size: A4 landscape;
  margin: 10mm 8mm 12mm;
}
</style>

<style scoped>
.print-paper {
  page: taxInvoice;
}
</style>
