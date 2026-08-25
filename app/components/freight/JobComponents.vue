<script setup lang="ts">
import type { FreightRecord } from '~/config/freight-seed'
import { useLcs } from '~/composables/lcs/useLcs'

const props = defineProps<{
  jobNo: string
  isCreate: boolean
}>()

const { t } = useI18n()
const { components, can, reportError, runCommand } = useLcs()
const rows = ref<FreightRecord[]>([])
const loading = ref(false)
const saving = ref(false)
const editingId = ref('')
const draftValues = ref<Array<Record<string, unknown>>>([])

async function load() {
  if (!props.jobNo) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    rows.value = await components.listForJob(props.jobNo)
  }
  finally {
    loading.value = false
  }
}

watch(() => props.jobNo, load, { immediate: true })

async function complete(row: FreightRecord) {
  try {
    await runCommand('component.complete', row.id, key => components.complete(row.id, key))
    await load()
  }
  catch (error) {
    reportError(error)
  }
}

function valueText(row: FreightRecord) {
  const values = Array.isArray(row.values) ? row.values as Array<Record<string, unknown>> : []
  return values.map(value => `${value.label}: ${value.valueText || value.valueDate || '—'}`).join(' · ')
}

function startEdit(row: FreightRecord) {
  editingId.value = String(row.id)
  draftValues.value = (Array.isArray(row.values) ? row.values : []).map(value => ({ ...(value as Record<string, unknown>) }))
}

function valueKey(value: Record<string, unknown>) {
  const type = String(value.dataType || 'text').toLowerCase()
  if (type === 'number' || type === 'decimal' || type === 'integer') return 'valueNumber'
  if (type === 'date' || type === 'datetime') return 'valueDate'
  if (type === 'boolean') return 'valueBoolean'
  return 'valueText'
}

function setDraftValue(value: Record<string, unknown>, next: unknown) {
  value[valueKey(value)] = next
}

async function saveValues(row: FreightRecord) {
  saving.value = true
  try {
    await components.saveValues(String(row.id), draftValues.value)
    editingId.value = ''
    await load()
  }
  catch (error) {
    reportError(error)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-2">
    <h4 class="text-xs font-semibold uppercase tracking-wide text-muted">
      {{ t('freight.ui.serviceComponents') }}
    </h4>
    <p class="text-xs text-muted">
      {{ t('freight.ui.componentVersionHint') }}
    </p>
    <UEmpty
      v-if="!loading && !rows.length"
      variant="naked"
      size="sm"
      icon="i-lucide-blocks"
      :title="t('freight.ui.noComponents')"
      class="py-6"
    />
    <ul v-else class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.id"
        class="rounded-md border border-default px-3 py-2"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-highlighted">{{ row.templateCode }}</p>
            <p class="text-xs text-muted">
              {{ row.groupCode || '—' }} · {{ t('freight.ui.capturedVersion') }} {{ row.templateVersion }}
              <span v-if="row.latestTemplateVersion && row.latestTemplateVersion !== row.templateVersion">
                · {{ t('freight.ui.latest') }} {{ row.latestTemplateVersion }}
              </span>
              · {{ t('freight.ui.sequence') }} {{ row.sequenceNo || row.sequence || '—' }}
              · {{ t(row.required ? 'freight.ui.required' : 'freight.ui.optional') }}
            </p>
            <p v-if="editingId !== row.id" class="mt-1 text-xs text-muted">{{ valueText(row) }}</p>
            <p v-if="row.completedBy || row.completedAt" class="mt-1 text-xs text-muted">
              {{ t('freight.ui.completedBy') }} {{ row.completedBy || '—' }} · {{ row.completedAt || '—' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="row.status === 'COMPLETED' ? 'success' : 'warning'" variant="subtle">
              {{ row.status }}
            </UBadge>
            <UButton
              v-if="row.status !== 'COMPLETED' && can('service_order.update') && !isCreate && editingId !== row.id"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              :label="t('freight.ui.edit')"
              @click="startEdit(row)"
            />
            <UButton
              v-if="row.status === 'PENDING' && can('service_order.update') && !isCreate"
              size="xs"
              color="neutral"
              variant="soft"
              :label="t('freight.ui.complete')"
              @click="complete(row)"
            />
          </div>
        </div>
        <div v-if="editingId === row.id" class="mt-4 grid gap-3 border-t border-default pt-4 md:grid-cols-2">
          <UFormField
            v-for="value in draftValues"
            :key="String(value.code)"
            :label="`${value.label || value.code}${value.required ? ' *' : ''}`"
          >
            <UCheckbox
              v-if="String(value.dataType).toLowerCase() === 'boolean'"
              :model-value="Boolean(value[valueKey(value)])"
              :label="t('freight.ui.yesNo')"
              @update:model-value="setDraftValue(value, $event)"
            />
            <UTextarea
              v-else-if="String(value.dataType).toLowerCase() === 'json'"
              :model-value="String(value[valueKey(value)] || '')"
              class="w-full"
              autoresize
              @update:model-value="setDraftValue(value, $event)"
            />
            <CommonAppInputDate
              v-else-if="['date', 'datetime'].includes(String(value.dataType).toLowerCase())"
              :model-value="String(value[valueKey(value)] ?? '')"
              :granularity="String(value.dataType).toLowerCase() === 'datetime' ? 'minute' : 'day'"
              class="w-full"
              @update:model-value="setDraftValue(value, $event)"
            />
            <UInputNumber
              v-else-if="['number', 'decimal', 'integer'].includes(String(value.dataType).toLowerCase())"
              :model-value="Number(value[valueKey(value)] || 0)"
              class="w-full"
              @update:model-value="setDraftValue(value, $event ?? 0)"
            />
            <UInput
              v-else
              :model-value="String(value[valueKey(value)] ?? '')"
              class="w-full"
              @update:model-value="setDraftValue(value, $event)"
            />
            <p v-if="value.validationMessage" class="mt-1 text-xs text-error">{{ value.validationMessage }}</p>
          </UFormField>
          <div class="flex items-end justify-end gap-2 md:col-span-2">
            <UButton color="neutral" variant="ghost" :label="t('freight.ui.cancel')" @click="editingId = ''" />
            <UButton :loading="saving" :label="t('freight.ui.saveValues')" @click="saveValues(row)" />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>
