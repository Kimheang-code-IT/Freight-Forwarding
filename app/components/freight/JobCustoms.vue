<script setup lang="ts">
import type { FreightField } from '~/config/freight-modules'
import type { FreightRecord } from '~/config/freight-seed'
import { useFreightLabel } from '~/composables/freight/useFreight'
import { displayText } from '~/utils/freight/job-workspace'

const props = defineProps<{
  job: FreightRecord
  records: FreightRecord[]
  fields: FreightField[]
  isCreate: boolean
}>()

const { t } = useI18n()
const { fieldLabel } = useFreightLabel()

const importRecords = computed(() => props.records.filter(row => String(row.direction || props.job.direction) === 'Import'))
const exportRecords = computed(() => props.records.filter(row => String(row.direction || props.job.direction) === 'Export'))


const detailFields = computed(() => props.fields.filter(field => ![
  'jobNo',
  'customer',
  'company',
].includes(field.key)).slice(0, 14))
</script>

<template>
  <div class="space-y-5">
    <FreightJobSectionHeader :title="t('freight.ui.customs')" />

    <section v-for="group in [
      { id: 'export', title: t('freight.ui.exportCustoms'), rows: exportRecords },
      { id: 'import', title: t('freight.ui.importCustoms'), rows: importRecords },
    ]" :key="group.id" class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">{{ group.title }}</h4>
      <FreightJobEmptyState
        v-if="!group.rows.length"
        :title="t('freight.ui.noRecords')"
        :description="t('freight.ui.customsEmptyHint')"
        icon="i-lucide-stamp"
      />
      <div v-else class="space-y-3">
        <div
          v-for="record in group.rows"
          :key="record.id"
          class="rounded-md border border-default p-3"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <p class="text-sm font-medium">{{ displayText(record.customsNo) }}</p>
            <UBadge :color="record.status === 'Cleared' ? 'success' : 'warning'" variant="subtle">
              {{ displayText(record.status) }}
            </UBadge>
          </div>
          <dl class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div v-for="field in detailFields" :key="field.key">
              <dt class="text-[11px] font-medium uppercase tracking-wide text-muted">{{ fieldLabel(field) }}</dt>
              <dd class="text-sm">{{ displayText(record[field.key]) }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  </div>
</template>
