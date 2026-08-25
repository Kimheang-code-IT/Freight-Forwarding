<script setup lang="ts">
import type { FreightRecord } from '~/config/freight-seed'

const props = defineProps<{
  job: FreightRecord
  documents: FreightRecord[]
  isCreate: boolean
}>()

const emit = defineEmits<{
  'update:checklist': [Array<Record<string, unknown>>]
}>()

const { t } = useI18n()

const checklist = computed({
  get: () => (Array.isArray(props.job.checklist) ? props.job.checklist as Array<Record<string, unknown>> : []),
  set: value => emit('update:checklist', value),
})

</script>

<template>
  <div class="space-y-4">
    <FreightJobSectionHeader :title="t('freight.ui.documents')" />

    <FreightChecklist v-model="checklist" :disabled="isCreate" />

    <FreightJobRelatedTable
      :rows="documents"
      :columns="[
        { key: 'documentType', label: t('freight.ui.cols.documentType') },
        { key: 'documentNo', label: t('freight.ui.cols.documentNo') },
        { key: 'file', label: t('freight.ui.cols.file') },
        { key: 'uploadDate', label: t('freight.ui.cols.uploadDate') },
        { key: 'status', label: t('freight.ui.cols.status'), status: true },
        { key: 'remark', label: t('freight.ui.cols.remark') },
      ]"
      :empty-title="t('freight.ui.noUploadedFiles')"
      :job-link="false"
    />
  </div>
</template>
