<script setup lang="ts">
import type { FreightField } from '~/config/freight-modules'
import type { FreightRecord } from '~/config/freight-seed'
import { useFreightLabel } from '~/composables/freight/useFreight'
import { displayText } from '~/utils/freight/job-workspace'

const props = defineProps<{
  job: FreightRecord
  shipment: FreightRecord | null
  fields: FreightField[]
  isCreate: boolean
}>()

const { t } = useI18n()
const { fieldLabel } = useFreightLabel()

const source = computed(() => props.shipment || props.job)

const items = computed(() => [
  { label: t('freight.ui.cols.bookingNo'), value: source.value.transportNo || source.value.transportReference },
  { label: t('freight.ui.cols.carrier'), value: source.value.carrier || source.value.supplier },
  { label: t('freight.ui.cols.transportParty'), value: source.value.truckCompany || source.value.supplier },
  { label: t('freight.ui.cols.vesselTruck'), value: source.value.vessel || source.value.truckNo },
  { label: t('freight.ui.cols.voyage'), value: source.value.voyage },
  { label: t('freight.ui.cols.origin'), value: source.value.origin || source.value.pickup || source.value.port },
  { label: t('freight.ui.cols.destination'), value: source.value.destination || source.value.deliveryLocation },
  { label: t('freight.ui.cols.pickupDate'), value: source.value.shipmentDate || source.value.registeredDate },
  { label: t('freight.ui.cols.etd'), value: source.value.shipmentDate || source.value.registeredDate },
  { label: t('freight.ui.cols.eta'), value: source.value.etaFactory || source.value.etaPort },
  { label: t('freight.ui.cols.status'), value: source.value.status },
  { label: t('freight.ui.cols.remark'), value: source.value.operationalRemark || source.value.remark, span: 2 as const },
])

</script>

<template>
  <div class="space-y-4">
    <FreightJobSectionHeader
      :title="t('freight.ui.bookingTitle')"
      :description="t('freight.ui.bookingHint')"
    />

    <FreightJobEmptyState
      v-if="isCreate"
      :title="t('freight.ui.saveJobFirst')"
      :description="t('freight.ui.saveJobFirstHint')"
      icon="i-lucide-truck"
    />
    <FreightJobDefinitionList v-else-if="shipment || job.transportNo || job.carrier || job.truckNo" :items="items" />
    <FreightJobEmptyState
      v-else
      :title="t('freight.ui.noBooking')"
      :description="t('freight.ui.noBookingHint')"
      icon="i-lucide-truck"
    />

    <dl v-if="shipment && fields.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="field in fields.slice(0, 12)" :key="field.key" class="rounded-md border border-default px-3 py-2">
        <dt class="text-[11px] font-medium uppercase tracking-wide text-muted">{{ fieldLabel(field) }}</dt>
        <dd class="mt-0.5 text-sm">{{ displayText(shipment[field.key]) }}</dd>
      </div>
    </dl>
  </div>
</template>
