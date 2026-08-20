<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { DocumentTabSchema } from '~/types/docetra/common'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { useConfirm } from '~/composables/common/useConfirm'
import { usePageSeo } from '~/composables/usePageSeo'
import { useFreightRecordChrome } from '~/composables/freight/useFreightRecordChrome'
import {
  emptyFreightRecord,
  groupedFields,
  statusColor,
  useFreightLabel,
  useFreightRouteModule,
} from '~/composables/freight/useFreight'
import { getFreightModule } from '~/config/freight-modules'
import type { FreightRecord } from '~/config/freight-seed'
import { JOB_STATUS } from '~/config/freight-options'

const { module, isCreate, recordId } = useFreightRouteModule()
const store = useFreightStore()
const toast = useToast()
const { t, locale } = useI18n()
const { km, moduleTitle, moduleSingular } = useFreightLabel()
const { setBreadcrumbs, setBadges, clear } = useAppHeader()
const { confirm } = useConfirm()

const saving = ref(false)
const activeTab = ref('overview')
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

const tabs = computed<DocumentTabSchema[]>(() => [
  { id: 'overview', labelKey: 'Overview', label: km.value ? 'ទិដ្ឋភាពទូទៅ' : 'Overview', sections: [{ id: 'overview', title: km.value ? 'ទិដ្ឋភាពទូទៅ' : 'Overview', fields: [] }] },
  { id: 'shipment', labelKey: 'Shipment', label: km.value ? 'ការដឹកជញ្ជូន' : 'Shipment', sections: [{ id: 'shipment', fields: [] }] },
  { id: 'customs', labelKey: 'Customs', label: km.value ? 'គយ' : 'Customs', sections: [{ id: 'customs', fields: [] }] },
  { id: 'documents', labelKey: 'Documents', label: km.value ? 'ឯកសារ' : 'Documents', sections: [{ id: 'documents', fields: [] }] },
  { id: 'charges', labelKey: 'Charges', label: km.value ? 'ថ្លៃ' : 'Charges', sections: [{ id: 'charges', fields: [] }] },
  { id: 'payment', labelKey: 'Payment', label: km.value ? 'ការទូទាត់' : 'Payment', sections: [{ id: 'payment', fields: [] }] },
])

function load() {
  if (!module.value) return
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

const jobNo = computed(() => String(model.value.jobNo || ''))
const shipment = computed(() => store.list('shipments').find(row => row.jobNo === jobNo.value) || null)
const customs = computed(() => store.list('customs').find(row => row.jobNo === jobNo.value) || null)
const documents = computed(() => store.list('documents').filter(row => row.jobNo === jobNo.value))
const deliveries = computed(() => store.list('deliveries').find(row => row.jobNo === jobNo.value) || null)
const charges = computed(() => store.list('jobCharges').filter(row => row.jobNo === jobNo.value))
const supplierCosts = computed(() => store.list('supplierCosts').filter(row => row.jobNo === jobNo.value))
const payments = computed(() => store.list('customerPayments').filter(row => row.jobNo === jobNo.value))
const debitNotes = computed(() => store.list('debitNotes').filter(row => row.jobNo === jobNo.value))
const checklist = computed({
  get: () => (Array.isArray(model.value.checklist) ? model.value.checklist as Array<Record<string, unknown>> : []),
  set: value => { model.value = { ...model.value, checklist: value } },
})

const shipmentModule = getFreightModule('/operations/shipments')
const customsModule = getFreightModule('/operations/customs')

watch([() => model.value.jobNo, () => model.value.status], () => {
  if (!module.value) return
  setBreadcrumbs([
    { label: moduleTitle(module.value), to: module.value.path },
    { label: String(model.value.jobNo || moduleTitle(module.value)) },
  ])
  setBadges([
    { label: String(model.value.direction || ''), color: 'info' },
    { label: String(model.value.status || ''), color: statusColor(String(model.value.status || '')) as any },
  ].filter(item => item.label))
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

function recordValue(record: FreightRecord | null | undefined, key: string) {
  return record?.[key] || '—'
}

async function save() {
  if (!module.value) return
  saving.value = true
  try {
    const saved = isCreate.value || !model.value.id
      ? store.create('jobs', model.value, 'job')
      : store.save('jobs', model.value)
    store.addAudit('Saved job', 'Jobs', String(saved.jobNo))
    toast.add({ title: km.value ? 'បានរក្សាទុក' : 'Saved', color: 'success' })
    if (isCreate.value) await navigateTo(`/operations/jobs/${saved.id}`)
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
  toast.add({ title: km.value ? 'បានចម្លង' : 'Duplicated', color: 'success' })
  await navigateTo(`/operations/jobs/${copy.id}`)
}

async function deleteJob() {
  if (!model.value.id || isCreate.value) return
  const ok = await confirm({ kind: 'delete', count: 1 })
  if (!ok) return
  store.remove('jobs', [String(model.value.id)])
  store.addAudit('Deleted job', 'Jobs', String(model.value.jobNo || model.value.id))
  toast.add({ title: km.value ? 'បានលុប' : 'Deleted', color: 'success' })
  await navigateTo('/operations/jobs')
}

const moreItems = computed<DropdownMenuItem[][]>(() => {
  if (isCreate.value || !model.value.id) return []
  return [[
    {
      label: km.value ? 'ចម្លង' : 'Duplicate',
      icon: 'i-lucide-copy',
      onSelect: () => { void duplicateJob() },
    },
    {
      label: km.value ? 'លុប' : 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => { void deleteJob() },
    },
  ]]
})

const closeReady = computed(() => {
  const docsOk = checklist.value.every(item => !item.required || ['Uploaded', 'Approved'].includes(String(item.status)))
  return {
    documents: docsOk,
    customs: ['Cleared'].includes(String(customs.value?.status || model.value.customsStatus || '')),
    delivery: ['Delivered', 'POD Received'].includes(String(deliveries.value?.status || '')) || ['Delivered', 'Closed'].includes(String(model.value.status)),
    pod: checklist.value.find(item => item.type === 'POD')?.status === 'Approved' || checklist.value.find(item => item.type === 'POD')?.status === 'Uploaded',
    charges: debitNotes.value.length > 0,
    supplier: supplierCosts.value.length > 0,
    revenue: debitNotes.value.length > 0,
    profit: store.list('profitability').some(row => row.jobNo === jobNo.value),
  }
})

async function closeJob() {
  const missing = Object.entries(closeReady.value).filter(([, ok]) => !ok).map(([key]) => key)
  if (missing.length) {
    toast.add({ title: km.value ? 'មិនអាចបិទការងារបានទេ' : 'Cannot close job yet', description: missing.join(', '), color: 'warning' })
    return
  }
  setField('status', 'Closed')
  await save()
}

const jobSections = computed(() => module.value ? groupedFields(module.value) : [])
</script>

<template>
  <DocumentAppDocumentPage
    v-if="module && !notFound"
    :tabs="tabs"
    :active-tab="activeTab"
    :field-value="fieldValue"
    :set-field-value="setFieldValue"
    :saving="saving"
    :save-label="t('docetra.common.save')"
    :confirm-save="false"
    show-cancel
    show-comments
    show-meta-rail
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
    :meta-subtitle="String(model.customer || moduleSingular(module))"
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
    @update:active-tab="activeTab = $event"
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
        :to="{ path: '/finance/debit-notes/new', query: { jobNo, customer: String(model.customer || '') } }"
        :label="km ? 'ប័ណ្ណឥណពន្ធ' : 'Debit Note'"
      />
      <UButton
        color="success"
        variant="soft"
        size="sm"
        icon="i-lucide-lock"
        class="rounded-md"
        :label="km ? 'បិទការងារ' : 'Close Job'"
        @click="closeJob"
      />
    </template>

    <template #form>
      <DocumentAppDocumentContentShell wide>
        <div class="space-y-8 py-6">
          <div v-if="activeTab === 'overview'" class="space-y-5">
            <h3 class="text-lg font-semibold text-highlighted">
              {{ km ? 'ទិដ្ឋភាពទូទៅ' : 'Overview' }}
            </h3>
            <FreightProgressSteps :current="String(model.status || JOB_STATUS[0])" :steps="JOB_STATUS" />
            <div class="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
              <FreightFieldInput
                v-for="field in jobSections.flatMap(section => section.fields)"
                :key="field.key"
                :field="field"
                :model-value="model[field.key]"
                @update:model-value="setField(field.key, $event)"
                :class="field.colSpan === 2 || field.type === 'textarea' ? 'sm:col-span-2' : ''"
              />
            </div>
          </div>

          <div v-else-if="activeTab === 'shipment'" class="space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-lg font-semibold text-highlighted">{{ km ? 'ការដឹកជញ្ជូន' : 'Shipment' }}</h3>
              <UButton size="xs" :to="shipment ? `/operations/shipments/${shipment.id}` : '/operations/shipments/new'" :label="shipment ? (km ? 'បើកការដឹក' : 'Open shipment') : (km ? 'ចុះឈ្មោះដឹក' : 'Register shipment')" />
            </div>
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-for="field in shipmentModule?.fields || []" :key="field.key" class="rounded-md bg-muted/40 px-3 py-2">
                <dt class="text-xs text-muted">{{ locale === 'km' && field.labelKm ? field.labelKm : field.label }}</dt>
                <dd class="text-sm font-medium">{{ (shipment || model)[field.key] || '—' }}</dd>
              </div>
            </dl>
          </div>

          <div v-else-if="activeTab === 'customs'" class="space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-lg font-semibold text-highlighted">{{ km ? 'គយ' : 'Customs' }}</h3>
              <UButton size="xs" :to="customs ? `/operations/customs/${customs.id}` : '/operations/customs/new'" :label="km ? 'បើកគយ' : 'Open customs'" />
            </div>
            <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-for="field in (customsModule?.fields || []).slice(0, 16)" :key="field.key" class="rounded-md bg-muted/40 px-3 py-2">
                <dt class="text-xs text-muted">{{ locale === 'km' && field.labelKm ? field.labelKm : field.label }}</dt>
                <dd class="text-sm font-medium">{{ recordValue(customs, field.key) }}</dd>
              </div>
            </dl>
          </div>

          <div v-else-if="activeTab === 'documents'" class="space-y-4">
            <h3 class="text-lg font-semibold text-highlighted">{{ km ? 'បញ្ជីឯកសារការងារ' : 'Job Document Checklist' }}</h3>
            <FreightChecklist v-model="checklist" />
            <ul class="divide-y divide-default rounded-md border border-default">
              <li v-for="doc in documents" :key="doc.id">
                <NuxtLink :to="`/operations/documents/${doc.id}`" class="flex justify-between px-3 py-2 text-sm hover:bg-elevated/50">
                  <span>{{ doc.documentType }} · {{ doc.documentNo }}</span>
                  <span class="text-muted">{{ doc.status }}</span>
                </NuxtLink>
              </li>
              <li v-if="!documents.length" class="px-3 py-4 text-sm text-muted">{{ km ? 'មិនទាន់មានឯកសារផ្ទុក' : 'No uploaded files yet.' }}</li>
            </ul>
          </div>

          <div v-else-if="activeTab === 'charges'" class="space-y-4">
            <h3 class="text-lg font-semibold text-highlighted">{{ km ? 'ថ្លៃ' : 'Charges' }}</h3>
            <div class="grid gap-4 lg:grid-cols-2">
              <section>
                <h4 class="mb-2 text-sm font-medium">{{ km ? 'ថ្លៃអតិថិជន' : 'Customer Charges' }}</h4>
                <ul class="divide-y divide-default rounded-md border border-default">
                  <li v-for="row in charges.filter(item => item.chargeSide === 'Customer')" :key="row.id" class="flex justify-between px-3 py-2 text-sm">
                    <span>{{ row.chargeType }} · {{ row.description }}</span>
                    <span>${{ row.amount }}</span>
                  </li>
                  <li v-for="row in debitNotes" :key="row.id" class="flex justify-between px-3 py-2 text-sm">
                    <NuxtLink :to="`/finance/debit-notes/${row.id}`">{{ row.debitNoteNo }}</NuxtLink>
                    <span>${{ row.total }}</span>
                  </li>
                </ul>
              </section>
              <section>
                <h4 class="mb-2 text-sm font-medium">{{ km ? 'ថ្លៃអ្នកផ្គត់ផ្គង់' : 'Supplier Costs' }}</h4>
                <ul class="divide-y divide-default rounded-md border border-default">
                  <li v-for="row in supplierCosts" :key="row.id" class="flex justify-between px-3 py-2 text-sm">
                    <span>{{ row.supplier }} · {{ row.chargeType }}</span>
                    <span>${{ row.amount }}</span>
                  </li>
                </ul>
              </section>
            </div>
          </div>

          <div v-else-if="activeTab === 'payment'" class="space-y-3">
            <h3 class="text-lg font-semibold text-highlighted">{{ km ? 'ការទូទាត់' : 'Payment' }}</h3>
            <ul class="divide-y divide-default rounded-md border border-default">
              <li v-for="row in payments" :key="row.id">
                <NuxtLink :to="`/finance/customer-payments/${row.id}`" class="flex justify-between px-3 py-2 text-sm hover:bg-elevated/50">
                  <span>{{ row.paymentNo }} · {{ row.paymentMethod }}</span>
                  <span>{{ row.status }} · ${{ row.received }} / ${{ row.amountDue }}</span>
                </NuxtLink>
              </li>
              <li v-if="!payments.length" class="px-3 py-4 text-sm text-muted">{{ km ? 'មិនទាន់មានការទូទាត់' : 'No payments recorded.' }}</li>
            </ul>
          </div>
        </div>
      </DocumentAppDocumentContentShell>
    </template>
  </DocumentAppDocumentPage>
</template>

