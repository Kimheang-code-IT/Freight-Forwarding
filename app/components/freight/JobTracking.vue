<script setup lang="ts">
import type { TimelineItem } from '@nuxt/ui'
import type { FreightRecord } from '~/config/freight-seed'
import { JOB_STATUS } from '~/config/freight-options'
import { displayText } from '~/utils/freight/job-workspace'

const props = defineProps<{
  job: FreightRecord
  delivery: FreightRecord | null
  shipment: FreightRecord | null
  customs: FreightRecord | null
  isCreate: boolean
}>()

const { t } = useI18n()

const currentIndex = computed(() => {
  const index = JOB_STATUS.findIndex(step => step === String(props.job.status || ''))
  return index >= 0 ? index : 0
})

const items = computed<TimelineItem[]>(() => {
  const dates: Record<string, unknown> = {
    'Job Created': props.job.date,
    'Documents Received': props.job.date,
    'Transport Registered': props.shipment?.registeredDate || props.job.registeredDate,
    'Customs Processing': props.customs?.submissionDate,
    'Customs Cleared': props.customs?.clearanceDate,
    'In Transit': props.job.shipmentDate,
    'Arrived Factory': props.delivery?.arrivalTime || props.job.actualArrival,
    'Delivered': props.delivery?.completedTime || props.job.deliveryDate,
    'Financial Completed': props.job.updatedAt,
    'Closed': props.job.status === 'Closed' ? props.job.updatedAt : '',
  }
  return JOB_STATUS.map((step, index) => {
    const state = index < currentIndex.value
      ? (t('freight.ui.completed'))
      : index === currentIndex.value
        ? (t('freight.ui.current'))
        : (t('freight.ui.pending'))
    return {
      value: index,
      title: step,
      date: displayText(dates[step]),
      description: state,
      icon: index < currentIndex.value
        ? 'i-lucide-check'
        : index === currentIndex.value
          ? 'i-lucide-circle-dot'
          : 'i-lucide-circle',
    }
  })
})

const podItems = computed(() => [
  { label: t('freight.ui.cols.factoryAddress'), value: props.delivery?.deliveryAddress || props.job.deliveryLocation, span: 2 as const },
  { label: t('freight.ui.cols.driver'), value: props.delivery?.driver },
  { label: t('freight.ui.cols.truckNo'), value: props.delivery?.truckNo || props.job.truckNo },
  { label: t('freight.ui.cols.arrival'), value: props.delivery?.arrivalTime || props.job.actualArrival },
  { label: t('freight.ui.cols.unloading'), value: props.delivery?.unloadingTime },
  { label: t('freight.ui.cols.receiver'), value: props.delivery?.receiver },
  { label: 'POD', value: props.delivery?.pod },
  { label: t('freight.ui.cols.deliveryStatus'), value: props.delivery?.status },
  { label: t('freight.ui.cols.remark'), value: props.delivery?.remark || props.job.deliveryRemark, span: 2 as const },
])

</script>

<template>
  <div class="space-y-5">
    <FreightJobSectionHeader :title="t('freight.ui.trackingTitle')" />

    <UTimeline
      color="neutral"
      size="sm"
      :model-value="currentIndex"
      :items="items"
      class="max-w-xl"
    />

    <section class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
        {{ t('freight.ui.deliveryPod') }}
      </h4>
      <FreightJobEmptyState
        v-if="!delivery"
        :title="t('freight.ui.noDelivery')"
        icon="i-lucide-package-check"
      />
      <FreightJobDefinitionList v-else :items="podItems" />
    </section>
  </div>
</template>
