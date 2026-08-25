<script setup lang="ts">
import type { FreightField } from '~/config/freight-modules'
import type { FreightRecord } from '~/config/freight-seed'
import { JOB_STATUS } from '~/config/freight-options'
import { useFreightLabel } from '~/composables/freight/useFreight'
import { JOB_OVERVIEW_SECTIONS } from '~/utils/freight/job-workspace'

const props = defineProps<{
  model: FreightRecord
  isCreate: boolean
  editing: boolean
  sections: Array<{ title: string, titleKm?: string, fields: FreightField[] }>
}>()

const emit = defineEmits<{
  'update:field': [key: string, value: unknown]
  edit: []
}>()

const { t } = useI18n()
const { groupTitle } = useFreightLabel()

const overviewFields = computed(() =>
  props.sections.filter(section => JOB_OVERVIEW_SECTIONS.has(section.title)),
)

const summaryItems = computed(() => [
  { label: t('freight.ui.cols.jobNo'), value: props.model.jobNo },
  { label: t('freight.ui.cols.customer'), value: props.model.customer },
  { label: t('freight.ui.cols.jobDate'), value: props.model.date },
  { label: t('freight.ui.cols.direction'), value: props.model.direction },
  { label: t('freight.ui.cols.origin'), value: props.model.origin || props.model.pickup },
  { label: t('freight.ui.cols.destination'), value: props.model.destination || props.model.deliveryLocation },
  { label: t('freight.ui.cols.transportType'), value: props.model.transportMode || props.model.serviceType },
  { label: t('freight.ui.cols.etd'), value: props.model.shipmentDate || props.model.registeredDate },
  { label: t('freight.ui.cols.eta'), value: props.model.etaFactory || props.model.etaPort },
  { label: t('freight.ui.cols.assignedStaff'), value: props.model.assignedStaff },
  { label: t('freight.ui.cols.jobStatus'), value: props.model.status },
  { label: t('freight.ui.cols.workflow'), value: props.model.workflowStatus || 'OPEN' },
  { label: t('freight.ui.cols.sourceQuotationLabel'), value: props.model.quotationNo },
])
</script>

<template>
  <div class="space-y-4">
    <FreightJobSectionHeader :title="t('freight.ui.overview')">
      <template #actions>
        <UButton
          v-if="!isCreate && !editing"
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-lucide-pencil"
          :label="t('freight.ui.edit')"
          @click="emit('edit')"
        />
      </template>
    </FreightJobSectionHeader>

    <FreightProgressSteps :current="String(model.status || JOB_STATUS[0])" :steps="JOB_STATUS" />

    <FreightJobDefinitionList v-if="!isCreate && !editing" :items="summaryItems" />
    <FreightJobComponents v-if="!isCreate" :job-no="String(model.jobNo || '')" :is-create="isCreate" />

    <div v-else class="space-y-5">
      <section v-for="section in overviewFields" :key="section.title" class="space-y-3">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ groupTitle(section.title) }}
        </h4>
        <div class="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
          <FreightFieldInput
            v-for="field in section.fields"
            :key="field.key"
            :field="field"
            :model-value="model[field.key]"
            :class="field.colSpan === 2 || field.type === 'textarea' ? 'sm:col-span-2' : ''"
            @update:model-value="emit('update:field', field.key, $event)"
          />
        </div>
      </section>
    </div>
  </div>
</template>
