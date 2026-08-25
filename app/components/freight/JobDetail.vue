<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DocumentTabSchema } from '~/types/docetra/common'
import { useAppHeader, type AppHeaderBadge } from '~/composables/layout/useAppHeader'
import { usePageSeo } from '~/composables/usePageSeo'
import { useFreightRecordChrome } from '~/composables/freight/useFreightRecordChrome'
import { useJobRelated } from '~/composables/freight/useJobRelated'
import { useLcs } from '~/composables/lcs/useLcs'
import {
  emptyFreightRecord,
  groupedFields,
  statusColor,
  useFreightLabel,
  useFreightRouteModule,
} from '~/composables/freight/useFreight'
import type { FreightRecord } from '~/config/freight-seed'
import {
  JOB_WORKSPACE_SECTIONS,
  parseJobWorkspaceSection,
  type JobWorkspaceSection,
} from '~/utils/freight/job-workspace'

const { module, isCreate, recordId, route } = useFreightRouteModule()
const store = useFreightStore()
const toast = useToast()
const router = useRouter()
const { t } = useI18n()
const { moduleTitle, moduleSingular } = useFreightLabel()
const { setBreadcrumbs, setBadges, clear } = useAppHeader()
const lcs = useLcs()

const saving = ref(false)
const editingOverview = ref(false)
const model = ref<FreightRecord>({} as FreightRecord)
const notFound = ref(false)

const {
  commentBody,
  submittingComment,
  currentUser,
  listTo,
  canNavigatePrevious,
  canNavigateNext,
  navigatePrevious,
  navigateNext,
  comments,
  attachments,
  tags,
  activity: chromeActivity,
  metaOwner,
  metaAssignee,
  setChromeField,
  submitComment,
  updateComment,
  deleteComment,
  toggleFavorite,
} = useFreightRecordChrome({ module, isCreate, recordId, model })

const jobNo = computed(() => String(model.value.jobNo || ''))
const {
  shipments,
  shipment,
  customs,
  customsRecord,
  documents,
  delivery,
  charges,
  supplierCosts,
  payments,
  supplierPayments,
  debitNotes,
  receivables,
  payables,
  profitability,
  journals,
  containerRequirements,
  actualContainers,
} = useJobRelated(jobNo)

const activeTab = ref<JobWorkspaceSection>(parseJobWorkspaceSection(route.query.section))

const tabs = computed<DocumentTabSchema[]>(() =>
  JOB_WORKSPACE_SECTIONS.map(id => ({
    id,
    labelKey: `freight.jobSections.${id}`,
    label: t(`freight.jobSections.${id}`),
    sections: [{ id, title: t(`freight.jobSections.${id}`), fields: [] }],
  })),
)

function load() {
  if (!module.value) return
  editingOverview.value = isCreate.value
  if (isCreate.value) {
    model.value = emptyFreightRecord(module.value) as FreightRecord
    notFound.value = false
    return
  }
  const found = store.get('jobs', recordId.value)
  notFound.value = !found
  model.value = found ? { ...found } as FreightRecord : {} as FreightRecord
}

watch([recordId, isCreate], load, { immediate: true })

watch(() => route.query.section, (value) => {
  const section = parseJobWorkspaceSection(value)
  if (activeTab.value !== section) activeTab.value = section
})

watch(activeTab, (section) => {
  const current = parseJobWorkspaceSection(route.query.section)
  if (current === section) return
  const query = { ...route.query }
  if (section === 'overview') delete query.section
  else query.section = section
  void router.replace({ query })
})

const jobSections = computed(() => module.value ? groupedFields(module.value) : [])
const placeRows = computed<FreightRecord[]>(() => {
  const candidates = [
    ['Origin', model.value.origin],
    ['Pickup', model.value.pickup],
    ['Border', model.value.border],
    ['Destination', model.value.destination],
    ['Delivery', model.value.deliveryLocation || model.value.delivery],
  ]
  return candidates
    .filter(([, place]) => String(place || '').trim())
    .map(([placeRole, place], index) => ({
      id: `place-${index + 1}`,
      sequence: index + 1,
      placeRole,
      place,
      freeText: '',
      plannedActual: index === 0 ? model.value.pickupDate : index === candidates.length - 1 ? model.value.deliveryDate : '',
      notes: '',
    } as FreightRecord))
})
const routeLabel = computed(() => {
  const origin = String(model.value.origin || model.value.pickup || '')
  const destination = String(model.value.destination || model.value.deliveryLocation || '')
  if (origin && destination) return `${origin} → ${destination}`
  return origin || destination
})
const headerSubtitle = computed(() =>
  [String(model.value.customer || ''), routeLabel.value].filter(Boolean).join(' · '),
)

watch([() => model.value.jobNo, () => model.value.status, () => model.value.direction, headerSubtitle], () => {
  if (!module.value) return
  setBreadcrumbs([
    { label: moduleTitle(module.value), to: module.value.path },
    { label: String(model.value.jobNo || moduleTitle(module.value)) },
  ])
  const badges: AppHeaderBadge[] = []
  if (model.value.direction) badges.push({ label: String(model.value.direction), color: 'info' })
  if (model.value.workflowStatus) badges.push({ label: String(model.value.workflowStatus), color: 'neutral' })
  if (model.value.status) badges.push({ label: String(model.value.status), color: statusColor(String(model.value.status)) })
  setBadges(badges)
}, { immediate: true })

onBeforeUnmount(clear)
usePageSeo({ title: () => String(model.value.jobNo || 'Job') })

function setField(key: string, value: unknown) {
  model.value = { ...model.value, [key]: value }
}

function fieldValue(key: string) {
  return model.value[key]
}

function setFieldValue(key: string, value: unknown) {
  if (key === 'tags' || key === 'assignee' || key === 'attachments' || key === 'favorite') {
    setChromeField(key, value)
    return
  }
  setField(key, value)
}

function setChecklist(value: Array<Record<string, unknown>>) {
  model.value = { ...model.value, checklist: value }
}

async function save() {
  if (!module.value) return
  saving.value = true
  try {
    const payload = { ...model.value }
    if (isCreate.value || !payload.id) {
      const sequence = store.list('documentSequences').find(row => String(row.documentType) === 'Service Order')
      const next = Number(sequence?.lastValue || store.list('jobs').length) + 1
      payload.jobNo ||= `${sequence?.prefix || 'SO'}-${new Date().getFullYear()}-${String(next).padStart(Number(sequence?.paddingLength || 5), '0')}`
      payload.status ||= 'NEW'
      payload.workflowStatus ||= 'NEW'
      payload.currency ||= 'USD'
      payload.createdAt ||= new Date().toISOString()
      payload.createdBy ||= String(currentUser.value?.name || 'Current User')
      if (sequence) store.save('documentSequences', { ...sequence, lastValue: next })
    }
    const saved = isCreate.value || !payload.id
      ? store.create('jobs', payload, 'job')
      : store.save('jobs', model.value)
    store.addAudit('Saved job', 'Jobs', String(saved.jobNo))
    toast.add({ title: t('freight.ui.save'), color: 'success' })
    editingOverview.value = false
    if (isCreate.value) await navigateTo(`/service-orders/${saved.id}`)
    else model.value = saved
  }
  finally {
    saving.value = false
  }
}

async function duplicateJob() {
  if (!model.value.id) return
  const copy = store.duplicate('jobs', String(model.value.id), {
    jobNo: `${model.value.jobNo || 'JOB'}-COPY`,
    status: 'Job Created',
  })
  if (!copy) return
  store.addAudit('Duplicated job', 'Jobs', String(copy.jobNo))
  toast.add({ title: t('freight.ui.duplicated'), color: 'success' })
  await navigateTo(`/service-orders/${copy.id}`)
}

async function setOrderStatus(status: 'COMPLETED' | 'CANCELLED') {
  if (!model.value.id || !lcs.can('service_order.update')) return
  const saved = store.save('jobs', {
    ...model.value,
    status,
    workflowStatus: status,
    updatedAt: new Date().toISOString(),
  })
  model.value = saved
  store.addAudit(status === 'COMPLETED' ? 'Completed service order' : 'Cancelled service order', 'Service Orders', String(saved.jobNo))
  toast.add({ title: t(status === 'COMPLETED' ? 'freight.ui.jobCompleted' : 'freight.ui.jobCancelled'), color: status === 'COMPLETED' ? 'success' : 'warning' })
}

const moreItems = computed<DropdownMenuItem[][]>(() => {
  if (isCreate.value || !model.value.id) return []
  return [[
    {
      label: t('freight.ui.duplicate'),
      icon: 'i-lucide-copy',
      onSelect: () => { void duplicateJob() },
    },
    ...(lcs.can('service_order.update') && !['COMPLETED', 'CANCELLED'].includes(String(model.value.status).toUpperCase()) ? [{
      label: t('freight.ui.cancel'),
      icon: 'i-lucide-circle-x',
      color: 'error' as const,
      onSelect: () => { void setOrderStatus('CANCELLED') },
    }] : []),
  ]]
})

const closeReady = computed(() => {
  const checklist = Array.isArray(model.value.checklist) ? model.value.checklist as Array<Record<string, unknown>> : []
  const docsOk = checklist.every(item => !item.required || ['Uploaded', 'Approved'].includes(String(item.status)))
  const deliveryStatus = String(delivery.value?.status || '')
  return {
    documents: docsOk,
    customs: ['Cleared'].includes(String(customsRecord.value?.status || model.value.customsStatus || '')),
    delivery: ['Delivered', 'POD Received'].includes(deliveryStatus) || ['Delivered', 'Closed'].includes(String(model.value.status)),
    pod: checklist.find(item => item.type === 'POD')?.status === 'Approved' || checklist.find(item => item.type === 'POD')?.status === 'Uploaded',
    charges: debitNotes.value.length > 0,
    supplier: supplierCosts.value.length > 0,
    revenue: debitNotes.value.length > 0,
    profit: Boolean(profitability.value),
  }
})

async function closeJob() {
  const missing = Object.entries(closeReady.value).filter(([, ok]) => !ok).map(([key]) => key)
  if (missing.length) {
    toast.add({ title: t('freight.ui.cannotCloseJob'), description: missing.join(', '), color: 'warning' })
    return
  }
  setField('status', 'Closed')
  setField('workflowStatus', 'CLOSED')
  await save()
}

function onTabChange(value: string) {
  activeTab.value = parseJobWorkspaceSection(value)
}
</script>

<template>
  <DocumentAppDocumentPage
    v-if="module"
    :tabs="tabs"
    :active-tab="activeTab"
    :field-value="fieldValue"
    :set-field-value="setFieldValue"
    :saving="saving"
    :not-found="notFound"
    :save-label="t('docetra.common.save')"
    :confirm-save="false"
    show-cancel
    show-comments
    show-list-nav
    content-wide
    :can-navigate-previous="canNavigatePrevious"
    :can-navigate-next="canNavigateNext"
    :list-to="listTo"
    :is-create="isCreate"
    :can-comment="!isCreate"
    :comments="comments"
    :activity="chromeActivity"
    :attachments="attachments"
    :comment-body="commentBody"
    :submitting-comment="submittingComment"
    :current-user="currentUser"
    :meta-title="String(model.jobNo || moduleSingular(module))"
    :meta-subtitle="headerSubtitle || String(model.customer || moduleSingular(module))"
    :meta-status="String(model.status || '')"
    :meta-stage="String(model.direction || '')"
    :meta-owner="metaOwner"
    :meta-assignee="metaAssignee"
    :meta-tags="tags"
    :meta-created-at="String(model.createdAt || '')"
    :meta-updated-at="String(model.updatedAt || '')"
    :meta-favorite="Boolean(model.favorite)"
    :more-items="moreItems"
    :can-export="false"
    @update:active-tab="onTabChange"
    @update:comment-body="commentBody = $event"
    @update:attachments="setChromeField('attachments', $event)"
    @save="save"
    @refresh="load"
    @submit-comment="submitComment"
    @update-comment="updateComment"
    @delete-comment="deleteComment"
    @navigate-previous="navigatePrevious"
    @navigate-next="navigateNext"
    @toggle-favorite="toggleFavorite"
  >
    <template #actions>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        icon="i-lucide-receipt-text"
        class="rounded-md"
        :to="{ path: '/finance/documents/new', query: { documentType: 'CUSTOMER_INVOICE', jobNo, customer: String(model.customer || '') } }"
        :label="t('freight.ui.debitNote')"
      />
      <UButton
        v-if="lcs.can('service_order.update') && !['COMPLETED', 'CANCELLED'].includes(String(model.status).toUpperCase())"
        color="primary"
        variant="soft"
        size="sm"
        icon="i-lucide-circle-check"
        class="rounded-md"
        :disabled="isCreate"
        :label="t('freight.ui.complete')"
        @click="setOrderStatus('COMPLETED')"
      />
      <UButton
        color="success"
        variant="soft"
        size="sm"
        icon="i-lucide-lock"
        class="rounded-md"
        :disabled="isCreate"
        :label="t('freight.ui.closeJob')"
        @click="closeJob"
      />
    </template>

    <template #form>
      <DocumentAppDocumentContentShell wide>
        <div class="space-y-6 py-5">
          <FreightJobOverview
            v-if="activeTab === 'overview'"
            :model="model"
            :is-create="isCreate"
            :editing="editingOverview"
            :sections="jobSections"
            @update:field="setField"
            @edit="editingOverview = true"
          />
          <section v-else-if="activeTab === 'places'" class="space-y-2">
            <FreightJobSectionHeader :title="t('freight.ui.places')" />
            <FreightJobRelatedTable
              :rows="placeRows"
              :columns="[
                { key: 'sequence', label: t('freight.ui.cols.sequence') },
                { key: 'placeRole', label: t('freight.ui.cols.placeRole') },
                { key: 'place', label: t('freight.ui.cols.place') },
                { key: 'freeText', label: t('freight.ui.cols.freeTextPlace') },
                { key: 'plannedActual', label: t('freight.ui.cols.plannedActual') },
                { key: 'notes', label: t('freight.ui.cols.notes') },
              ]"
              :empty-title="t('freight.ui.noPlaces')"
              :job-link="false"
            />
          </section>
          <FreightJobContainers
            v-else-if="activeTab === 'container-requirements' || activeTab === 'actual-containers'"
            :job="model"
            :shipments="shipments"
            :requirements="containerRequirements"
            :actual="actualContainers"
            :is-create="isCreate"
            :mode="activeTab === 'container-requirements' ? 'requirements' : 'actual'"
          />
          <FreightJobComponents
            v-else-if="activeTab === 'components'"
            :job-no="jobNo"
            :is-create="isCreate"
          />
          <section v-else-if="activeTab === 'service-charges'" class="space-y-2">
            <FreightJobSectionHeader :title="t('freight.ui.serviceCharges')" />
            <FreightJobRelatedTable
              :rows="charges"
              :columns="[
                { key: 'chargeNo', label: t('freight.ui.cols.chargeNo') },
                { key: 'customer', label: t('freight.ui.cols.customer') },
                { key: 'chargeDate', label: t('freight.ui.cols.chargeDate') },
                { key: 'currency', label: t('freight.ui.cols.currency') },
                { key: 'total', label: t('freight.ui.cols.total'), money: true },
                { key: 'status', label: t('freight.ui.cols.status'), status: true },
              ]"
              :empty-title="t('freight.ui.noServiceCharges')"
              :record-path="row => `/service-charges/${row.id}`"
              :job-link="false"
            />
          </section>
          <FreightJobDocuments
            v-else-if="activeTab === 'attachments'"
            :job="model"
            :documents="documents"
            :is-create="isCreate"
            @update:checklist="setChecklist"
          />
          <FreightJobFinance
            v-else-if="activeTab === 'financial-documents'"
            :debit-notes="debitNotes"
            :payments="payments"
            :supplier-costs="supplierCosts"
            :supplier-payments="supplierPayments"
            :receivables="receivables"
            :payables="payables"
            :journals="journals"
            :is-create="isCreate"
            :job-no="jobNo"
            :customer="String(model.customer || '')"
          />
          <FreightJobActivity
            v-else-if="activeTab === 'audit-timeline'"
            :events="chromeActivity"
          />
        </div>
      </DocumentAppDocumentContentShell>
    </template>
  </DocumentAppDocumentPage>
</template>
