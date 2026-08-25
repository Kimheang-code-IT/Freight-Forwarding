<script setup lang="ts">
import type { FreightRecord } from '~/config/freight-seed'

defineProps<{
  debitNotes: FreightRecord[]
  payments: FreightRecord[]
  supplierCosts: FreightRecord[]
  supplierPayments: FreightRecord[]
  receivables: FreightRecord[]
  payables: FreightRecord[]
  journals?: FreightRecord[]
  isCreate: boolean
  jobNo: string
  customer: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="space-y-5">
    <FreightJobSectionHeader
      :title="t('freight.ui.jobFinance')"
      :description="t('freight.ui.jobFinanceHint')"
    >
      <template #actions>
        <UButton
          v-if="!isCreate"
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-lucide-receipt-text"
          :to="{ path: '/finance/documents/new', query: { documentType: 'CUSTOMER_INVOICE', jobNo, customer } }"
          :label="t('freight.ui.customerInvoice')"
        />
      </template>
    </FreightJobSectionHeader>

    <UAlert
      color="neutral"
      variant="subtle"
      icon="i-lucide-book-open"
      :title="$t('lcs.finance.documentVsJournal')"
    />

    <section class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
        {{ t('freight.ui.customerInvoices') }}
      </h4>
      <FreightJobRelatedTable
        :rows="debitNotes"
        :columns="[
          { key: 'debitNoteNo', label: t('freight.ui.cols.debitNoteNo') },
          { key: 'date', label: t('freight.ui.cols.date') },
          { key: 'total', label: t('freight.ui.cols.total'), money: true },
          { key: 'status', label: t('freight.ui.cols.status'), status: true },
          { key: 'journalId', label: t('freight.ui.cols.journal') },
        ]"
        :empty-title="t('freight.ui.noCustomerInvoices')"
        :record-path="(row) => `/finance/documents/${row.id}`"
        :job-link="false"
      />
    </section>

    <section class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
        {{ t('freight.ui.customerReceipts') }}
      </h4>
      <FreightJobRelatedTable
        :rows="payments"
        :columns="[
          { key: 'paymentNo', label: t('freight.ui.cols.receiptNo') },
          { key: 'received', label: t('freight.ui.cols.received'), money: true },
          { key: 'outstanding', label: t('freight.ui.cols.outstanding'), money: true },
          { key: 'status', label: t('freight.ui.cols.status'), status: true },
        ]"
        :empty-title="t('freight.ui.noReceipts')"
        :record-path="undefined"
        :job-link="false"
      />
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('freight.ui.supplierBills') }}
        </h4>
        <FreightJobRelatedTable
          :rows="supplierCosts"
          :columns="[
            { key: 'supplier', label: t('freight.ui.cols.supplier') },
            { key: 'invoiceNo', label: t('freight.ui.cols.invoice') },
            { key: 'amount', label: t('freight.ui.cols.amount'), money: true },
            { key: 'status', label: t('freight.ui.cols.status'), status: true },
          ]"
          :empty-title="t('freight.ui.noSupplierBills')"
          :record-path="undefined"
          :job-link="false"
        />
      </section>
      <section class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('freight.ui.supplierPayments') }}
        </h4>
        <FreightJobRelatedTable
          :rows="supplierPayments"
          :columns="[
            { key: 'paymentNo', label: t('freight.ui.cols.paymentNo') },
            { key: 'supplier', label: t('freight.ui.cols.supplier') },
            { key: 'amount', label: t('freight.ui.cols.amount'), money: true },
            { key: 'status', label: t('freight.ui.cols.status'), status: true },
          ]"
          :empty-title="t('freight.ui.noSupplierPayments')"
          :record-path="undefined"
          :job-link="false"
        />
      </section>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('freight.ui.receivable') }}
        </h4>
        <FreightJobRelatedTable
          :rows="receivables"
          :columns="[
            { key: 'invoiceNo', label: t('freight.ui.cols.invoice') },
            { key: 'outstanding', label: t('freight.ui.cols.outstanding'), money: true },
            { key: 'status', label: t('freight.ui.cols.status'), status: true },
          ]"
          :empty-title="t('freight.ui.noReceivables')"
          :job-link="false"
        />
      </section>
      <section class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('freight.ui.payable') }}
        </h4>
        <FreightJobRelatedTable
          :rows="payables"
          :columns="[
            { key: 'invoiceNo', label: t('freight.ui.cols.invoice') },
            { key: 'outstanding', label: t('freight.ui.cols.outstanding'), money: true },
            { key: 'status', label: t('freight.ui.cols.status'), status: true },
          ]"
          :empty-title="t('freight.ui.noPayables')"
          :job-link="false"
        />
      </section>
    </div>

    <section class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
        {{ t('freight.ui.journals') }}
      </h4>
      <FreightJobRelatedTable
        :rows="journals || []"
        :columns="[
          { key: 'entryNo', label: t('freight.ui.cols.entryNo') },
          { key: 'debitTotal', label: t('freight.ui.cols.debit'), money: true },
          { key: 'creditTotal', label: t('freight.ui.cols.credit'), money: true },
          { key: 'status', label: t('freight.ui.cols.status'), status: true },
        ]"
        :empty-title="t('freight.ui.noJournals')"
        :job-link="false"
      />
    </section>
  </div>
</template>
