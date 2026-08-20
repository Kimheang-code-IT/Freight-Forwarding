<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { useConfirm } from '~/composables/common/useConfirm'
import { usePageSeo } from '~/composables/usePageSeo'
import {
  asNumber,
  emptyFreightRecord,
  groupedFields,
  statusColor,
  useFreightLabel,
  useFreightRouteModule,
} from '~/composables/freight/useFreight'
import type { DocumentTabSchema } from '~/types/docetra/common'
import type { FreightField } from '~/config/freight-modules'
import type { FreightRecord } from '~/config/freight-seed'
import { useFreightRecordChrome } from '~/composables/freight/useFreightRecordChrome'

const { module, isCreate, recordId, route } = useFreightRouteModule()
const store = useFreightStore()
const { t } = useI18n()
const toast = useToast()
const { km, moduleTitle, moduleSingular } = useFreightLabel()
const { setBreadcrumbs, setBadges, clear } = useAppHeader()
const { confirm } = useConfirm()

const saving = ref(false)
const activeTab = ref('general')
const model = ref<FreightRecord>({ id: '' } as FreightRecord)
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
  activity,
  metaOwner,
  metaAssignee,
  setChromeField,
  submitComment,
  updateComment,
  deleteComment,
  toggleFavorite,
} = useFreightRecordChrome({ module, isCreate, recordId, model })

function load() {
  if (!module.value) return
  if (isCreate.value) {
    model.value = emptyFreightRecord(module.value) as FreightRecord
    notFound.value = false
    const query = route.query
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' && value) model.value[key] = value
    }
    return
  }
  const found = store.get(module.value.collection, recordId.value)
  notFound.value = !found
  model.value = found ? { ...found } as FreightRecord : emptyFreightRecord(module.value) as FreightRecord
}

watch([() => module.value?.path, recordId, isCreate], load, { immediate: true })

const title = computed(() => {
  if (!module.value) return ''
  if (isCreate.value) return `${km.value ? 'បង្កើត' : 'New'} ${moduleSingular(module.value)}`
  return String(model.value[module.value.titleField] || moduleSingular(module.value))
})

watch([title, () => module.value, () => model.value.status], () => {
  if (!module.value) return
  setBreadcrumbs([
    { label: moduleTitle(module.value), to: module.value.path },
    { label: title.value },
  ])
  setBadges(model.value.status ? [{ label: String(model.value.status), color: statusColor(String(model.value.status)) as any }] : [])
}, { immediate: true })

onBeforeUnmount(clear)
usePageSeo({ title: () => title.value })

const sections = computed(() => module.value ? groupedFields(module.value) : [])
const related = computed(() => module.value && !isCreate.value ? store.related(module.value, model.value) : [])
const readOnly = computed(() => Boolean(module.value?.readOnly))
const canMutateRecord = computed(() => Boolean(module.value) && !readOnly.value && !isCreate.value && Boolean(model.value.id))
const hasDuplicateAction = computed(() => Boolean(module.value?.actions?.some(action => action.key === 'duplicate')))
const headerActions = computed(() =>
  (module.value?.actions || []).filter(action => !['save', 'delete', 'duplicate'].includes(action.key)),
)

type FreightDocTab = DocumentTabSchema & { fields: FreightField[], kind?: 'fields' | 'lines' | 'related' }

function tabId(title: string, index: number) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${index}`
}

const tabs = computed<FreightDocTab[]>(() => {
  if (!module.value) return []
  const items: FreightDocTab[] = sections.value.map((group, index) => ({
    id: tabId(group.title, index),
    labelKey: group.title,
    label: km.value && group.titleKm ? group.titleKm : group.title,
    sections: [{
      id: tabId(group.title, index),
      title: km.value && group.titleKm ? group.titleKm : group.title,
      fields: [],
    }],
    fields: group.fields,
    kind: 'fields',
  }))
  if (module.value.tables?.length) {
    items.push({
      id: 'line-items',
      labelKey: 'Line items',
      label: km.value ? 'ជួរទិន្នន័យ' : 'Line items',
      sections: [{ id: 'line-items', title: km.value ? 'ជួរទិន្នន័យ' : 'Line items', fields: [] }],
      fields: [],
      kind: 'lines',
    })
  }
  if (!isCreate.value && related.value.length) {
    items.push({
      id: 'related',
      labelKey: 'Related',
      label: km.value ? 'ពាក់ព័ន្ធ' : 'Related',
      sections: [{ id: 'related', title: km.value ? 'ពាក់ព័ន្ធ' : 'Related', fields: [] }],
      fields: [],
      kind: 'related',
    })
  }
  return items
})

watch(tabs, (value) => {
  if (!value.some(tab => tab.id === activeTab.value)) activeTab.value = value[0]?.id || 'general'
}, { immediate: true })

const currentTab = computed(() => tabs.value.find(tab => tab.id === activeTab.value) || tabs.value[0])

const moreItems = computed<DropdownMenuItem[][]>(() => {
  if (!canMutateRecord.value) return []
  return [[
    ...(!hasDuplicateAction.value ? [{
      label: km.value ? 'ចម្លង' : 'Duplicate',
      icon: 'i-lucide-copy',
      onSelect: () => { void runAction('duplicate') },
    }] : []),
    {
      label: km.value ? 'លុប' : 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => { void deleteRecord() },
    },
  ]]
})

function setField(key: string, value: unknown) {
  model.value = { ...model.value, [key]: value }
  recalculate()
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

function setTable(key: string, rows: Array<Record<string, unknown>>) {
  model.value = { ...model.value, [key]: rows }
  recalculate()
}

function recalculate() {
  if (!module.value) return
  if (module.value.kind === 'quotation') {
    const charges = Array.isArray(model.value.otherCharges) ? model.value.otherCharges as Array<Record<string, unknown>> : []
    const chargeBuy = charges.reduce((sum, row) => sum + asNumber(row.quantity) * asNumber(row.buyingRate), 0)
    const chargeSell = charges.reduce((sum, row) => sum + asNumber(row.amount || asNumber(row.quantity) * asNumber(row.sellingRate)), 0)
    const totalBuying = asNumber(model.value.buying20) + asNumber(model.value.buying40) + asNumber(model.value.buying45) + chargeBuy
    const totalSelling = asNumber(model.value.selling20) + asNumber(model.value.selling40) + asNumber(model.value.selling45) + chargeSell
    const profit = totalSelling - totalBuying
    const pickup = String(model.value.pickup || '')
    const border = String(model.value.border || '')
    const delivery = String(model.value.delivery || '')
    model.value = {
      ...model.value,
      route: [pickup, border, delivery].filter(Boolean).join(' → '),
      totalBuying: Number(totalBuying.toFixed(2)),
      totalSelling: Number(totalSelling.toFixed(2)),
      amount: Number(totalSelling.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      margin: totalSelling ? Number(((profit / totalSelling) * 100).toFixed(1)) : 0,
    }
  }
  if (module.value.kind === 'debit-note') {
    const charges = Array.isArray(model.value.charges) ? model.value.charges as Array<Record<string, unknown>> : []
    const cambodiaSubtotal = charges.reduce((sum, row) => sum + asNumber(row.cambodia), 0)
    const vietnamSubtotal = charges.reduce((sum, row) => sum + asNumber(row.vietnam), 0)
    const cashSubtotal = charges.reduce((sum, row) => sum + asNumber(row.cash), 0)
    const amount = cambodiaSubtotal + vietnamSubtotal + cashSubtotal
    const vatRate = asNumber(model.value.vatRate)
    const vat = amount * (vatRate / 100)
    model.value = {
      ...model.value,
      cambodiaSubtotal: Number(cambodiaSubtotal.toFixed(2)),
      vietnamSubtotal: Number(vietnamSubtotal.toFixed(2)),
      cashSubtotal: Number(cashSubtotal.toFixed(2)),
      amount: Number(amount.toFixed(2)),
      vat: Number(vat.toFixed(2)),
      total: Number((amount + vat).toFixed(2)),
    }
  }
  if (module.value.path.includes('customer-payments')) {
    const outstanding = asNumber(model.value.amountDue) - asNumber(model.value.received)
    let status = String(model.value.status || 'Unpaid')
    if (outstanding <= 0 && asNumber(model.value.received) > 0) status = 'Paid'
    else if (asNumber(model.value.received) > 0) status = 'Partial'
    model.value = { ...model.value, outstanding: Number(outstanding.toFixed(2)), status }
  }
}

async function save(status?: string) {
  if (!module.value || readOnly.value) return
  saving.value = true
  try {
    recalculate()
    const payload = { ...model.value }
    if (status) payload.status = status
    const saved = isCreate.value || !payload.id
      ? store.create(module.value.collection, payload, module.value.collection.slice(0, 3))
      : store.save(module.value.collection, payload as FreightRecord)
    store.addAudit(status ? `Set status ${status}` : 'Saved', module.value.title, String(saved[module.value.titleField] || saved.id))
    toast.add({ title: km.value ? 'បានរក្សាទុក' : 'Saved', color: 'success' })
    if (isCreate.value) await navigateTo(`${module.value.path}/${saved.id}`)
    else model.value = saved
  }
  finally {
    saving.value = false
  }
}

async function runAction(key: string) {
  if (!module.value) return
  if (key === 'save' || key === 'saveDraft') return save(key === 'saveDraft' ? 'Draft' : undefined)
  if (key === 'approve') return save('Approved')
  if (key === 'send') return save('Sent')
  if (key === 'print') {
    window.print()
    return
  }
  if (key === 'duplicate') {
    const copy = store.duplicate(module.value.collection, String(model.value.id), {
      status: 'Draft',
      [module.value.titleField]: `${model.value[module.value.titleField]}-COPY`,
    })
    if (copy) {
      toast.add({ title: km.value ? 'បានចម្លង' : 'Duplicated', color: 'success' })
      await navigateTo(`${module.value.path}/${copy.id}`)
    }
    return
  }
  if (key === 'convertJob') {
    const job = store.create('jobs', {
      jobNo: `LCS-${model.value.direction === 'Export' ? 'EX' : 'IM'}-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      customer: model.value.customer,
      direction: model.value.direction,
      quotationNo: model.value.quotationNo,
      pickup: model.value.pickup,
      border: model.value.border,
      deliveryLocation: model.value.delivery,
      status: 'Job Created',
      contact: model.value.attention,
    }, 'job')
    store.addAudit('Converted to job', 'Quotations', String(model.value.quotationNo), job.jobNo as string)
    toast.add({ title: km.value ? 'បានបង្កើតការងារ' : 'Converted to job', color: 'success' })
    await navigateTo(`/operations/jobs/${job.id}`)
    return
  }
  if (key === 'delete') return deleteRecord()
  if (key === 'recordPayment') {
    await navigateTo({
      path: '/finance/customer-payments/new',
      query: {
        customer: String(model.value.customer || ''),
        jobNo: String(model.value.jobNo || ''),
        debitNoteNo: String(model.value.debitNoteNo || ''),
        amountDue: String(model.value.total || model.value.amount || ''),
      },
    })
  }
}

async function deleteRecord() {
  if (!module.value || !canMutateRecord.value) return
  const ok = await confirm({ kind: 'delete', count: 1 })
  if (!ok) return
  store.remove(module.value.collection, [String(model.value.id)])
  store.addAudit('Deleted', module.value.title, String(model.value[module.value.titleField] || model.value.id))
  toast.add({ title: t('docetra.actions.deletedItems', { n: 1 }), color: 'success' })
  await navigateTo(module.value.path)
}
</script>

<template>
  <DocumentAppDocumentPage
    v-if="module && !notFound"
    :tabs="tabs"
    :active-tab="activeTab"
    :field-value="fieldValue"
    :set-field-value="setFieldValue"
    :saving="saving"
    :read-only="readOnly"
    :can-save="!readOnly"
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
    :can-comment="!isCreate && !readOnly"
    :comments="comments"
    :activity="activity"
    :attachments="attachments"
    :comment-body="commentBody"
    :submitting-comment="submittingComment"
    :current-user="currentUser"
    :meta-title="title"
    :meta-subtitle="moduleSingular(module)"
    :meta-status="String(model.status || '')"
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
    @save="save()"
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
        v-for="action in headerActions"
        :key="action.key"
        :color="action.color || 'neutral'"
        variant="soft"
        size="sm"
        :icon="action.icon"
        :label="km && action.labelKm ? action.labelKm : action.label"
        :loading="saving"
        class="rounded-md"
        @click="runAction(action.key)"
      />
    </template>

    <template #form>
      <DocumentAppDocumentContentShell wide>
        <div class="space-y-8 py-6">
          <section v-if="currentTab?.kind === 'fields'" class="space-y-4">
            <h3 class="text-lg font-semibold text-highlighted">
              {{ currentTab.label }}
            </h3>
            <div class="grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
              <FreightFieldInput
                v-for="field in currentTab.fields"
                :key="field.key"
                :field="field"
                :model-value="model[field.key]"
                :disabled="readOnly || field.computed"
                :class="field.colSpan === 2 || field.type === 'textarea' ? 'sm:col-span-2' : ''"
                @update:model-value="setField(field.key, $event)"
              />
            </div>
          </section>

          <div v-else-if="currentTab?.kind === 'lines'" class="space-y-6">
            <h3 class="text-lg font-semibold text-highlighted">
              {{ currentTab.label }}
            </h3>
            <FreightLineTable
              v-for="table in module.tables || []"
              :key="table.key"
              :table="table"
              :model-value="(Array.isArray(model[table.key]) ? model[table.key] : []) as Array<Record<string, unknown>>"
              :disabled="readOnly"
              @update:model-value="setTable(table.key, $event)"
            />
          </div>

          <div v-else-if="currentTab?.kind === 'related'" class="space-y-3">
            <h3 class="text-lg font-semibold text-highlighted">
              {{ currentTab.label }}
            </h3>
            <FreightRelatedRecords :groups="related" />
          </div>
        </div>
      </DocumentAppDocumentContentShell>
    </template>
  </DocumentAppDocumentPage>
  <div v-else class="p-6 text-sm text-muted">{{ t('docetra.document.notFound') || 'Record not found.' }}</div>
</template>
