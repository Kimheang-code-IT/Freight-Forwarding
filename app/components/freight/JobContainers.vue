<script setup lang="ts">
import type { FreightRecord } from '~/config/freight-seed'
import { useLcs } from '~/composables/lcs/useLcs'

const props = defineProps<{
  job: FreightRecord
  shipments: FreightRecord[]
  requirements?: FreightRecord[]
  actual?: FreightRecord[]
  isCreate: boolean
  mode?: 'requirements' | 'actual' | 'both'
}>()

const { t } = useI18n()
const lcs = useLcs()
const toast = useToast()
const showAdd = ref(false)
const submitting = ref(false)
const draft = reactive<{
  containerRequirementId: string
  containerType: string
  containerNo: string
  sealNo: string
  status: string
  netWeightKg?: number | string
  grossWeightKg?: number | string
}>({
  containerRequirementId: '',
  containerType: '',
  containerNo: '',
  sealNo: '',
  status: 'Loaded',
  netWeightKg: undefined,
  grossWeightKg: undefined,
})
const visibleMode = computed(() => props.mode || 'both')
const containerStatusItems = computed(() => ['Planned', 'Loaded', 'In Transit', 'Delivered', 'Returned'].map(value => ({
  value,
  label: t(`freight.reportCatalog.statuses.${value.toLowerCase().replaceAll(' ', '_')}`),
})))

const planned = computed(() => {
  if (props.requirements?.length) {
    return props.requirements.map(row => ({
      ...row,
      requiredQuantity: row.requiredQuantity || row.quantity,
      sourceQuotation: row.sourceQuotation || props.job.sourceQuotation || props.job.quotationNo,
      actualContainersCount: (props.actual || []).filter(item => item.containerRequirementId === row.id).length,
    }))
  }
  const type = String(props.job.containerType || '').trim()
  if (!type) return []
  return [{
    id: `planned-${props.job.id || 'new'}`,
    containerType: type,
    requiredQuantity: 1,
    sourceQuotation: props.job.sourceQuotation || props.job.quotationNo,
    description: props.job.description,
    actualContainersCount: actualRows.value.length,
    status: 'Required',
  }] as FreightRecord[]
})

const actualRows = computed<FreightRecord[]>(() => {
  if (props.actual?.length) return props.actual
  const fromShipments = props.shipments.filter(row => String(row.containerNo || '').trim())
  if (fromShipments.length) return fromShipments
  if (String(props.job.containerNo || '').trim()) {
    return [{
      id: `job-container-${props.job.id || 'job'}`,
      containerNo: props.job.containerNo,
      containerType: props.job.containerType,
      sealNo: props.job.sealNo,
      status: props.job.status,
    }] as FreightRecord[]
  }
  return []
})

function resetDraft() {
  Object.assign(draft, {
    containerRequirementId: props.requirements?.[0]?.id || '',
    containerType: props.requirements?.[0]?.containerType || props.job.containerType || '',
    containerNo: '',
    sealNo: '',
    status: 'Loaded',
    netWeightKg: undefined,
    grossWeightKg: undefined,
  })
}

async function addContainer() {
  const net = Number(draft.netWeightKg || 0)
  const gross = Number(draft.grossWeightKg || 0)
  if (!String(draft.containerNo || '').trim()) {
    toast.add({ title: t('freight.ui.containerNoRequired'), color: 'error' })
    return
  }
  if (gross && net && gross < net) {
    toast.add({ title: t('freight.ui.grossLessThanNet'), color: 'error' })
    return
  }
  submitting.value = true
  try {
    await lcs.jobs.addActualContainer(String(props.job.id), { ...draft })
    toast.add({ title: t('freight.ui.actualContainerAdded'), color: 'success' })
    showAdd.value = false
    resetDraft()
  }
  catch (error) {
    lcs.reportError(error)
  }
  finally {
    submitting.value = false
  }
}

watch(showAdd, (value) => {
  if (value) resetDraft()
})

</script>

<template>
  <div class="space-y-5">
    <FreightJobSectionHeader :title="t('freight.ui.containers')" />

    <section v-if="visibleMode !== 'actual'" class="space-y-2">
      <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
        {{ t('freight.ui.plannedRequirements') }}
      </h4>
      <FreightJobRelatedTable
        :rows="planned"
        :columns="[
          { key: 'containerType', label: t('freight.ui.cols.containerType') },
          { key: 'requiredQuantity', label: t('freight.ui.cols.requiredQuantity') },
          { key: 'sourceQuotation', label: t('freight.ui.cols.sourceQuotation') },
          { key: 'description', label: t('freight.ui.cols.description') },
          { key: 'actualContainersCount', label: t('freight.ui.cols.actualContainers') },
        ]"
        :empty-title="t('freight.ui.noPlannedType')"
        :job-link="false"
      />
    </section>

    <section v-if="visibleMode !== 'requirements'" class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ t('freight.ui.actualContainers') }}
        </h4>
        <UButton
          v-if="!isCreate && lcs.can('service_order.update')"
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :label="t('freight.ui.addContainer')"
          @click="showAdd = !showAdd"
        />
      </div>
      <UCard v-if="showAdd" variant="subtle">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <UFormField :label="t('freight.ui.cols.requirement')">
            <USelect v-model="draft.containerRequirementId" :items="(requirements || []).map(row => ({ label: `${row.containerType} · ${row.quantity || 1}`, value: row.id }))" class="w-full" />
          </UFormField>
          <UFormField :label="t('freight.ui.cols.containerType')" required>
            <UInput v-model="draft.containerType" class="w-full" />
          </UFormField>
          <UFormField :label="t('freight.ui.cols.containerNo')" required>
            <UInput v-model="draft.containerNo" class="w-full" />
          </UFormField>
          <UFormField :label="t('freight.ui.cols.sealNo')">
            <UInput v-model="draft.sealNo" class="w-full" />
          </UFormField>
          <UFormField :label="t('freight.ui.cols.netWeight')">
            <UInput v-model="draft.netWeightKg" type="number" class="w-full" />
          </UFormField>
          <UFormField :label="t('freight.ui.cols.grossWeight')">
            <UInput v-model="draft.grossWeightKg" type="number" class="w-full" />
          </UFormField>
          <UFormField :label="t('freight.ui.status')">
            <USelect v-model="draft.status" :items="containerStatusItems" class="w-full" />
          </UFormField>
        </div>
        <div class="mt-3 flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" :label="t('freight.ui.cancel')" @click="showAdd = false" />
          <UButton :loading="submitting" :label="t('freight.ui.saveContainer')" @click="addContainer" />
        </div>
      </UCard>
      <FreightJobRelatedTable
        :rows="actualRows"
        :columns="[
          { key: 'containerNo', label: t('freight.ui.cols.containerNo') },
          { key: 'containerType', label: t('freight.ui.cols.containerType') },
          { key: 'containerRequirementId', label: t('freight.ui.cols.requirement') },
          { key: 'sealNo', label: t('freight.ui.cols.sealNo') },
          { key: 'status', label: t('freight.ui.cols.status'), status: true },
          { key: 'netWeightKg', label: t('freight.ui.cols.netWeight') },
          { key: 'grossWeightKg', label: t('freight.ui.cols.grossWeight') },
          { key: 'createdAt', label: t('freight.ui.cols.createdAt') },
        ]"
        :empty-title="t('freight.ui.noActualContainers')"
        :empty-description="t('freight.ui.noActualContainersHint')"
        :job-link="false"
      />
    </section>
  </div>
</template>
