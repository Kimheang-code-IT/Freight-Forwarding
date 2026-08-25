<script setup lang="ts">
import type { FreightRecord } from '~/config/freight-seed'
import { asNumber, formatMoneyUsd } from '~/composables/freight/useFreight'

const props = defineProps<{
  charges: FreightRecord[]
  supplierCosts: FreightRecord[]
  isCreate: boolean
  jobNo: string
}>()

const { t } = useI18n()

const customerCharges = computed(() => props.charges.filter(row => row.chargeSide === 'Customer'))
const supplierRows = computed(() => [
  ...props.charges.filter(row => row.chargeSide === 'Supplier'),
  ...props.supplierCosts,
])
const issuedWithoutJournal = computed(() =>
  props.charges.filter(row => String(row.status) === 'Issued' && !row.journalId),
)

const revenue = computed(() => customerCharges.value.reduce((sum, row) => sum + asNumber(row.amount), 0))
const supplierTotal = computed(() => props.supplierCosts.reduce((sum, row) => sum + asNumber(row.amount), 0))
const otherExpense = computed(() =>
  props.charges.filter(row => row.chargeSide === 'Supplier').reduce((sum, row) => sum + asNumber(row.amount), 0),
)
const totalCost = computed(() => supplierTotal.value + otherExpense.value)
const query = computed(() => ({ jobNo: props.jobNo }))
</script>

<template>
  <div class="space-y-5">
    <FreightJobSectionHeader :title="t('freight.ui.chargesCosts')">
      <template #actions>
        <UButton
          v-if="!isCreate"
          size="xs"
          color="neutral"
          variant="soft"
          :to="{ path: '/service-charges/new', query }"
          :label="t('freight.ui.addCharge')"
        />
      </template>
    </FreightJobSectionHeader>

    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      :title="$t('lcs.finance.chargeNoPost')"
      :description="$t('lcs.finance.chargeVsInvoice')"
    />

    <p v-if="issuedWithoutJournal.length" class="text-xs text-muted">
      {{ $t('lcs.finance.issuedNoJournal', { n: issuedWithoutJournal.length }) }}
    </p>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('freight.ui.customerCharges') }}
        </h4>
        <FreightJobRelatedTable
          :rows="customerCharges"
          :columns="[
            { key: 'chargeType', label: t('freight.ui.cols.type') },
            { key: 'description', label: t('freight.ui.cols.description') },
            { key: 'amount', label: t('freight.ui.cols.amount'), money: true },
            { key: 'status', label: t('freight.ui.cols.status'), status: true },
          ]"
          :empty-title="t('freight.ui.noCustomerCharges')"
          :record-path="(row) => `/service-charges/${row.id}`"
          :job-link="false"
        />
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">{{ t('freight.ui.commercialTotal') }}</dt>
            <dd class="text-end font-medium tabular-nums">{{ formatMoneyUsd(revenue) }}</dd>
          </div>
        </dl>
      </section>

      <section class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('freight.pages.supplierCosts') }}
        </h4>
        <FreightJobRelatedTable
          :rows="supplierRows"
          :columns="[
            { key: 'supplier', label: t('freight.ui.cols.supplier') },
            { key: 'chargeType', label: t('freight.ui.cols.type') },
            { key: 'amount', label: t('freight.ui.cols.amount'), money: true },
            { key: 'status', label: t('freight.ui.cols.status'), status: true },
          ]"
          :empty-title="t('freight.ui.noSupplierCosts')"
          :record-path="(row) => supplierCosts.some(item => item.id === row.id) ? undefined : `/service-charges/${row.id}`"
          :job-link="false"
        />
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">{{ t('freight.ui.supplierCost') }}</dt>
            <dd class="text-end font-medium tabular-nums">{{ formatMoneyUsd(supplierTotal) }}</dd>
          </div>
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">{{ t('freight.ui.totalCost') }}</dt>
            <dd class="text-end font-medium tabular-nums">{{ formatMoneyUsd(totalCost) }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
