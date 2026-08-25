<script setup lang="ts">
import type { FreightRecord } from '~/config/freight-seed'
import { asNumber, formatMoneyUsd } from '~/composables/freight/useFreight'

const props = defineProps<{
  record: FreightRecord | null
}>()

const { t } = useI18n()

const items = computed(() => {
  const row = props.record
  if (!row) return []
  return [
    { label: t('freight.ui.commercialRevenue'), value: formatMoneyUsd(row.revenue) },
    { label: t('freight.ui.postedRevenue'), value: formatMoneyUsd(row.postedRevenue) },
    { label: t('freight.ui.supplierCost'), value: formatMoneyUsd(asNumber(row.truckingCost) + asNumber(row.customsCost) + asNumber(row.vietnamCost)) },
    { label: t('freight.ui.otherExpense'), value: formatMoneyUsd(row.otherCost) },
    { label: t('freight.ui.totalCost'), value: formatMoneyUsd(row.totalCost) },
    { label: t('freight.ui.commercialProfit'), value: formatMoneyUsd(row.profit) },
    { label: t('freight.ui.postedProfit'), value: formatMoneyUsd(row.postedProfit) },
    { label: t('freight.ui.profitMargin'), value: `${formatMoney(asNumber(row.margin))}%` },
  ]
})

function formatMoney(value: unknown) {
  return asNumber(value).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
</script>

<template>
  <div class="space-y-4">
    <FreightJobSectionHeader :title="t('freight.ui.profit')" />
    <FreightJobEmptyState
      v-if="!record"
      :title="t('freight.ui.noProfit')"
      :description="t('freight.ui.noProfitHint')"
      icon="i-lucide-chart-no-axes-combined"
    />
    <dl v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="item in items"
        :key="item.label"
        class="rounded-md border border-default px-3 py-2"
      >
        <dt class="text-[11px] font-medium uppercase tracking-wide text-muted">{{ item.label }}</dt>
        <dd class="mt-0.5 text-end text-sm font-semibold tabular-nums text-highlighted">{{ item.value }}</dd>
      </div>
    </dl>
  </div>
</template>
