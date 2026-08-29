<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { FreightRecord } from '~/config/freight-seed'
import { useLcs } from '~/composables/lcs/useLcs'
import { useConfirm } from '~/composables/common/useConfirm'
import { useAppLocalization } from '~/composables/settings/useAppLocalization'
import { freightStatusBadge, shortDay, statusColor } from '~/composables/freight/useFreight'
import {
  applyTaskValue,
  isAttributeRequired,
  missingRequiredValues,
  taskValueModel,
  taskValueToDocumentField,
  valuesFromTemplateAttributes,
} from '~/utils/freight/job-task-fields'
import { freightTableUiCompactReadonly } from '~/utils/table/theme'
import {
  assignmentForGroup,
  groupCodeForSection,
  groupForSection,
  isConfigFlagYes,
  resolveGroupTemplate,
} from '~/utils/freight/job-component-tabs'
import {
  componentInstanceLimits,
  componentSummaryAttributes,
  resolveComponentInstanceMode,
} from '~/utils/freight/component-instance-mode'

const props = defineProps<{
  jobNo: string
  jobId?: string
  direction?: string
  isCreate: boolean
  section: string
}>()

const { t, te } = useI18n()
const toast = useToast()
const { confirm } = useConfirm()
const { formatDate, formatNumber } = useAppLocalization()
const lcs = useLcs()
const store = useFreightStore()
const auth = useAuthStore()
const tenant = useTenantStore()
const rows = ref<FreightRecord[]>([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editing = ref(false)
const selectedId = ref('')
const creating = ref(false)
const detailOpen = ref(false)
const draftValues = ref<Array<Record<string, unknown>>>([])

const selected = computed(() => rows.value.find(row => String(row.id) === selectedId.value) || null)

const groups = computed(() => store.list('componentGroups'))
const templates = computed(() => store.list('componentTemplates'))
const assignments = computed(() => store.list('tradeDirectionComponents'))
const groupCode = computed(() => groupCodeForSection(props.section, groups.value))
const group = computed(() => groupForSection(props.section, groups.value))
const assignment = computed(() => assignmentForGroup({
  group: group.value,
  assignments: assignments.value,
  direction: props.direction,
}))
const template = computed(() => resolveGroupTemplate({
  group: group.value,
  templates: templates.value,
  assignments: assignments.value,
  direction: props.direction,
}))
const effectiveMode = computed(() => resolveComponentInstanceMode(assignment.value, template.value))
const repeatable = computed(() => effectiveMode.value === 'REPEATABLE')
const limits = computed(() => componentInstanceLimits(assignment.value, template.value))
const templateAttributes = computed(() =>
  Array.isArray(template.value?.attributes) ? template.value!.attributes as Array<Record<string, unknown>> : [],
)
const sectionTitle = computed(() => {
  const key = `freight.jobSections.${props.section}`
  if (te(key)) return t(key)
  return String(group.value?.name || props.section)
})
const sectionRows = computed(() =>
  rows.value
    .filter(row => String(row.groupCode || '').toUpperCase() === groupCode.value)
    .sort((a, b) => Number(a.sequenceNo || 0) - Number(b.sequenceNo || 0)),
)
const showList = computed(() => repeatable.value || sectionRows.value.length > 1)
const atMaximum = computed(() => Boolean(limits.value.maximum && sectionRows.value.length >= limits.value.maximum))
const cardinalityConflict = computed(() => effectiveMode.value === 'SINGLE' && sectionRows.value.length > 1)
const canMutate = computed(() =>
  !props.isCreate && Boolean(props.jobNo) && lcs.can('service_order.update'),
)
const formRecord = computed(() => creating.value ? null : selected.value)
const formCompleted = computed(() => String(formRecord.value?.status || '') === 'COMPLETED')

async function load() {
  if (!props.jobNo) {
    rows.value = []
    return
  }
  loading.value = true
  try {
    rows.value = await lcs.components.listForJob(props.jobNo)
  }
  finally {
    loading.value = false
  }
}

function cloneCaptured(values: unknown) {
  return (Array.isArray(values) ? values : []).map(value => ({
    ...(value as Record<string, unknown>),
    required: isAttributeRequired(value as Record<string, unknown>),
  }))
}

function emptyDraft() {
  return valuesFromTemplateAttributes(templateAttributes.value)
}

function bindDraft(row: FreightRecord | null, startEditing = false) {
  selectedId.value = row ? String(row.id) : ''
  creating.value = !row
  draftValues.value = row && Array.isArray(row.values) && row.values.length
    ? cloneCaptured(row.values)
    : emptyDraft()
  editing.value = startEditing
}

watch(
  () => [props.jobNo, auth.user?.id, tenant.organizationId, tenant.branchId],
  load,
  { immediate: true },
)
watch(
  () => store.list('serviceComponents').filter(row => String(row.jobNo || '') === props.jobNo).length,
  load,
  { immediate: true },
)
watch(() => props.section, () => {
  editing.value = false
  creating.value = false
  detailOpen.value = false
  selectedId.value = ''
})
watch([sectionRows, template, showList], () => {
  if (showList.value || detailOpen.value || editing.value) return
  const row = sectionRows.value[0] || null
  if (row) bindDraft(row, false)
  else bindDraft(null, canMutate.value && Boolean(template.value))
}, { immediate: true })

const missingLabels = computed(() =>
  missingRequiredValues(draftValues.value).map(value => String(value.label || value.code)),
)

function openDetail(row: FreightRecord, startEditing = false) {
  creating.value = false
  bindDraft(row, startEditing)
  detailOpen.value = true
}

function openNew() {
  if (atMaximum.value) return
  bindDraft(null, true)
  detailOpen.value = true
}

function resetDraft() {
  if (formRecord.value) bindDraft(formRecord.value, false)
  else bindDraft(null, canMutate.value)
}

async function persistValues() {
  if (!canMutate.value) {
    toast.add({ title: t('freight.ui.saveJobFirst'), color: 'warning' })
    return
  }
  if (!template.value && !formRecord.value) return
  saving.value = true
  try {
    let componentId = String(formRecord.value?.id || '')
    if (!componentId) {
      const created = await lcs.components.ensureForJob(props.jobNo, {
        jobNo: props.jobNo,
        serviceOrderId: props.jobId,
        groupCode: groupCode.value,
        templateCode: String(template.value?.code || assignment.value?.componentTemplate || groupCode.value),
        templateVersion: String(template.value?.version || assignment.value?.templateVersion || ''),
        latestTemplateVersion: String(template.value?.version || ''),
        required: isConfigFlagYes(assignment.value?.required) || isConfigFlagYes(template.value?.required),
        repeatable: repeatable.value,
        instanceMode: effectiveMode.value,
        maximumInstances: limits.value.maximum,
        values: draftValues.value,
        forceNew: creating.value && repeatable.value,
      })
      componentId = String(created.id)
      selectedId.value = componentId
      creating.value = false
    }
    await lcs.components.saveValues(componentId, draftValues.value)
    store.reload()
    editing.value = false
    detailOpen.value = false
    await load()
    toast.add({ title: t('freight.ui.taskSaved'), color: 'success' })
  }
  catch (error) {
    lcs.reportError(error)
  }
  finally {
    saving.value = false
  }
}

async function completeTask() {
  const current = formRecord.value
  if (!current) return
  try {
    await lcs.runCommand('component.complete', String(current.id), key => lcs.components.complete(String(current.id), key))
    await load()
    toast.add({ title: t('freight.ui.taskCompleted'), color: 'success' })
  }
  catch (error) {
    lcs.reportError(error)
  }
}

function recordLabel(row: FreightRecord) {
  const sequence = Number(row.sequenceNo || 0) || sectionRows.value.indexOf(row) + 1
  return `${String(template.value?.name || sectionTitle.value)} #${sequence}`
}

function valueFor(row: FreightRecord, code: unknown) {
  const values = (Array.isArray(row.values) ? row.values : []) as Array<Record<string, unknown>>
  const value = values.find(item => String(item.code || '') === String(code || ''))
  return value ? taskValueModel(value) : ''
}

function formattedSummaryValue(row: FreightRecord, attribute: Record<string, unknown>) {
  const value = valueFor(row, attribute.code)
  if (value == null || value === '') return '—'
  const dataType = String(attribute.dataType || '').toLowerCase()
  if (dataType === 'date') return formatDate(value)
  if (dataType === 'number') return formatNumber(Number(value))
  return String(value)
}

async function removeTask(row: FreightRecord) {
  if (deleting.value || String(row.status || '').toUpperCase() === 'COMPLETED') return
  const accepted = await confirm({
    kind: 'delete',
    descriptionKey: 'freight.ui.deleteComponentConfirm',
    descriptionParams: { name: recordLabel(row) },
  })
  if (!accepted) return
  deleting.value = true
  try {
    await lcs.runCommand('component.remove', String(row.id), key => lcs.components.remove(String(row.id), key))
    await load()
    toast.add({ title: t('freight.ui.componentDeleted'), color: 'success' })
  }
  catch (error) {
    lcs.reportError(error)
  }
  finally {
    deleting.value = false
  }
}

function rowMenuItems(row: FreightRecord): DropdownMenuItem[][] {
  const items: DropdownMenuItem[] = [{
    label: t('freight.ui.open'),
    icon: 'i-lucide-eye',
    onSelect: () => openDetail(row),
  }]
  if (canMutate.value && row.status !== 'COMPLETED') {
    items.push({
      label: t('freight.ui.edit'),
      icon: 'i-lucide-pencil',
      onSelect: () => openDetail(row, true),
    })
    items.push({
      label: t('freight.ui.complete'),
      icon: 'i-lucide-check-circle-2',
      onSelect: () => {
        selectedId.value = String(row.id)
        void completeTask()
      },
    })
    items.push({
      label: t('freight.ui.deleteComponent'),
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => { void removeTask(row) },
    })
  }
  return [items]
}

const summaryAttributes = computed(() => componentSummaryAttributes(template.value))

const tableColumns = computed<TableColumn<FreightRecord>[]>(() => [
  {
    accessorKey: 'sequenceNo',
    header: t('freight.ui.record'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, recordLabel(row.original)),
  },
  ...summaryAttributes.value.map(attribute => ({
    id: `summary-${String(attribute.code || '')}`,
    header: String(attribute.label || attribute.code || ''),
    cell: ({ row }: { row: { original: FreightRecord } }) => h('span', {}, formattedSummaryValue(row.original, attribute)),
  } as TableColumn<FreightRecord>)),
  {
    accessorKey: 'status',
    header: t('freight.ui.status'),
    cell: ({ row }) => freightStatusBadge(row.original.status),
  },
  {
    accessorKey: 'updatedAt',
    header: t('freight.ui.lastUpdated'),
    cell: ({ row }) => h('span', { class: 'tabular-nums text-muted' }, shortDay(row.original.updatedAt)),
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-16 text-end', td: 'text-end' } },
    cell: ({ row }) => h(UDropdownMenu, {
      content: { align: 'end' },
      items: rowMenuItems(row.original),
      'aria-label': t('freight.ui.actions'),
    }, () => h(UButton, {
      icon: 'i-lucide-ellipsis',
      color: 'neutral',
      variant: 'ghost',
      size: 'xs',
      'aria-label': t('freight.ui.actions'),
    })),
  },
])

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
</script>

<template>
  <section class="space-y-2">
    <FreightJobSectionHeader :title="sectionTitle" :description="t('freight.ui.componentVersionHint')">
      <template #actions>
        <UBadge
v-if="repeatable"
color="neutral"
variant="subtle"
size="sm">
          {{ t('freight.ui.componentRecordCount', { count: sectionRows.length }) }}
        </UBadge>
        <UButton
v-if="repeatable && canMutate && template"
size="xs"
icon="i-lucide-plus"
          :disabled="atMaximum"
:label="t('freight.ui.addComponentRecord', { name: sectionTitle })"
@click="openNew" />
      </template>
    </FreightJobSectionHeader>

    <UAlert
v-if="cardinalityConflict"
color="warning"
variant="subtle"
icon="i-lucide-triangle-alert"
      :title="t('freight.ui.cardinalityConflict')"
:description="t('freight.ui.cardinalityConflictHint')" />
    <UAlert
v-if="repeatable && atMaximum"
color="neutral"
variant="subtle"
icon="i-lucide-info"
      :title="t('freight.ui.componentLimitReached', { count: limits.maximum })" />

    <template v-if="!loading && !showList && (template || formRecord)">
      <div class="space-y-4">
        <div v-if="formRecord || template" class="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{{ formRecord?.templateCode || template?.code }}</span>
          <span v-if="formRecord?.templateVersion">
            · {{ t('freight.ui.capturedVersion') }} {{ formRecord.templateVersion }}
          </span>
          <span v-else-if="template?.version">· {{ template.version }}</span>
          <span
            v-if="formRecord?.latestTemplateVersion && formRecord.latestTemplateVersion !== formRecord.templateVersion">
            · {{ t('freight.ui.latest') }} {{ formRecord.latestTemplateVersion }}
          </span>
          <UBadge
v-if="formRecord"
:color="statusColor(String(formRecord.status || ''))"
variant="subtle"
size="sm">
            {{ formRecord.status }}
          </UBadge>
        </div>

        <UAlert
v-if="editing && missingLabels.length"
color="warning"
variant="subtle"
icon="i-lucide-triangle-alert"
          :title="t('freight.ui.validationErrors')"
:description="missingLabels.join(', ')" />

        <div v-if="draftValues.length" class="grid gap-3 sm:grid-cols-2">
          <DocumentAppDynamicFieldRenderer
v-for="value in draftValues"
:key="String(value.code)"
            :field="taskValueToDocumentField(value, !editing)"
:model-value="taskValueModel(value)"
:disabled="!editing"
            @update:model-value="applyTaskValue(value, $event)" />
        </div>
        <FreightJobEmptyState
v-else
:title="t('freight.ui.noTasks')"
:description="t('freight.ui.noTasksHint')"
          icon="i-lucide-file-text" />

        <div class="flex flex-wrap items-center justify-end gap-2">
          <UButton
v-if="canMutate && !formCompleted && !editing"
color="neutral"
variant="soft"
size="sm"
            icon="i-lucide-pencil"
:label="t('freight.ui.edit')"
@click="editing = true" />
          <UButton
v-if="editing"
color="neutral"
variant="ghost"
size="sm"
:label="t('actions.cancel')"
            @click="resetDraft" />
          <UButton
v-if="editing"
size="sm"
:loading="saving"
:label="t('freight.ui.saveTask')"
            @click="persistValues" />
          <UButton
v-if="formRecord?.status === 'PENDING' && !editing && canMutate"
size="sm"
            icon="i-lucide-check-circle-2"
:label="t('freight.ui.complete')"
@click="completeTask" />
        </div>
      </div>
    </template>

    <div
v-else-if="!loading && showList && sectionRows.length"
      class="overflow-hidden rounded-md border border-default">
      <div class="overflow-x-auto">
        <UTable
:data="sectionRows"
:columns="tableColumns"
:get-row-id="(row: FreightRecord) => String(row.id || '')"
          class="freight-table freight-table-compact min-w-max"
:ui="freightTableUiCompactReadonly"
          @select="(_event: Event, row: { original: FreightRecord }) => openDetail(row.original)" />
      </div>
    </div>
    <FreightJobEmptyState
v-else-if="!loading"
      :title="repeatable ? t('freight.ui.noComponentRecords', { name: sectionTitle }) : t('freight.ui.noTasks')"
      :description="repeatable ? t('freight.ui.noComponentRecordsHint', { name: sectionTitle }) : t('freight.ui.noTasksHint')"
      icon="i-lucide-file-text" />
    <div v-else class="flex justify-center py-6">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin text-muted" />
    </div>

    <USlideover
v-model:open="detailOpen"
      :title="creating ? t('freight.ui.addComponentRecord', { name: sectionTitle }) : (formRecord ? recordLabel(formRecord) : t('freight.ui.taskDetails'))"
      :dismissible="false"
      :close="{ color: 'primary', variant: 'outline', class: 'rounded-full' }"
      :ui="{ content: 'max-w-md' }">
      <template #body>
        <div v-if="showList" class="space-y-4">
          <div class="space-y-1">
            <p class="text-sm font-semibold text-highlighted">
              {{ formRecord?.templateCode || template?.code || sectionTitle }}
            </p>
            <p class="text-xs text-muted">
              {{ groupCode || '—' }}
              <span v-if="formRecord?.templateVersion">
                · {{ t('freight.ui.capturedVersion') }} {{ formRecord.templateVersion }}
              </span>
              <span
                v-if="formRecord?.latestTemplateVersion && formRecord.latestTemplateVersion !== formRecord.templateVersion">
                · {{ t('freight.ui.latest') }} {{ formRecord.latestTemplateVersion }}
              </span>
              · {{ t(isConfigFlagYes(formRecord?.required ?? assignment?.required) ? 'freight.ui.required' :
              'freight.ui.optional') }}
            </p>
            <UBadge
v-if="formRecord"
:color="statusColor(String(formRecord.status || ''))"
variant="subtle"
size="sm">
              {{ formRecord.status }}
            </UBadge>
          </div>

          <div
v-if="formRecord?.completedBy || formRecord?.completedAt"
            class="rounded-md border border-default px-3 py-2 text-xs text-muted">
            <p class="mb-0.5 font-medium uppercase tracking-wide">{{ t('freight.ui.completionInfo') }}</p>
            {{ t('freight.ui.completedBy') }} {{ formRecord.completedBy || '—' }} · {{ formRecord.completedAt || '—' }}
          </div>

          <UAlert
v-if="editing && missingLabels.length"
color="warning"
variant="subtle"
icon="i-lucide-triangle-alert"
            :title="t('freight.ui.validationErrors')"
:description="missingLabels.join(', ')" />

          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('freight.ui.dynamicFields') }}</p>
            <DocumentAppDynamicFieldRenderer
v-for="value in draftValues"
:key="String(value.code)"
              :field="taskValueToDocumentField(value, !editing)"
:model-value="taskValueModel(value)"
              :disabled="!editing"
@update:model-value="applyTaskValue(value, $event)" />
          </div>
        </div>
      </template>
      <template #footer>
        <div v-if="showList" class="flex w-full flex-wrap items-center justify-end gap-2">
          <UButton
v-if="canMutate && !formCompleted && !editing"
color="neutral"
variant="soft"
size="sm"
            icon="i-lucide-pencil"
:label="t('freight.ui.edit')"
@click="editing = true" />
          <UButton
v-if="editing"
color="neutral"
variant="ghost"
size="sm"
:label="t('actions.cancel')"
            @click="resetDraft(); if (creating) detailOpen = false" />
          <UButton
v-if="editing"
size="sm"
:loading="saving"
:label="t('freight.ui.saveTask')"
            @click="persistValues" />
          <UButton
v-if="formRecord?.status === 'PENDING' && !editing && canMutate"
size="sm"
            icon="i-lucide-check-circle-2"
:label="t('freight.ui.complete')"
@click="completeTask" />
        </div>
      </template>
    </USlideover>
  </section>
</template>
