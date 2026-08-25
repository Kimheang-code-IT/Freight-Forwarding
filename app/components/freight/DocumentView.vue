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
import { roleMainFields } from '~/config/role-form'
import { useLcs } from '~/composables/lcs/useLcs'
import { isLcsDomainError } from '~/utils/lcs/errors'
import { financeDomainStatus, isRecordReadOnly, quotationDomainStatus } from '~/utils/lcs/states'
import { normalizePermissionRows, permissionRowsToFlatKeys } from '~/utils/role/permissions'
import type { AppRolePermissionRow } from '~/types/docetra/entities'
import { documentSequencePreview, documentSequenceTypeLabel } from '~/utils/document-sequences'

const { module, isCreate, recordId, route } = useFreightRouteModule()
const store = useFreightStore()
const auth = useAuthStore()
const { t } = useI18n()
const toast = useToast()
const { moduleTitle, moduleSingular, fieldLabel, groupTitle, tableTitle, actionLabel } = useFreightLabel()
const { setBreadcrumbs, setBadges, clear } = useAppHeader()
const { confirm } = useConfirm()
const lcs = useLcs()

const saving = ref(false)
const activeTab = ref('general')
const model = ref<FreightRecord>({ id: '' } as FreightRecord)
const originalModel = ref<FreightRecord | null>(null)
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

function applyRoleMatrix() {
  if (module.value?.collection !== 'roles') return
  const rows = normalizePermissionRows(model.value.permissionRows as AppRolePermissionRow[] | undefined)
  model.value = {
    ...model.value,
    permissionRows: rows,
    permissionCount: permissionRowsToFlatKeys(rows).length,
  }
}

function load() {
  if (!module.value) return
  if (isCreate.value) {
    model.value = emptyFreightRecord(module.value) as FreightRecord
    if (module.value.collection === 'documentSequences') {
      model.value.organizationName = auth.user?.organizationName || ''
      model.value.nextNumberPreview = documentSequencePreview(model.value)
    }
    originalModel.value = null
    notFound.value = false
    const query = route.query
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' && value) model.value[key] = value
    }
    applyRoleMatrix()
    return
  }
  const found = store.get(module.value.collection, recordId.value)
  notFound.value = !found
  model.value = found ? { ...found } as FreightRecord : emptyFreightRecord(module.value) as FreightRecord
  originalModel.value = found ? { ...found } as FreightRecord : null
  applyRoleMatrix()
}

watch([() => module.value?.path, recordId, isCreate], load, { immediate: true })

const title = computed(() => {
  if (!module.value) return ''
  if (isCreate.value) return t('freight.ui.newEntity', { entity: moduleSingular(module.value) })
  const value = model.value[module.value.titleField]
  return module.value.collection === 'documentSequences'
    ? documentSequenceTypeLabel(value || moduleSingular(module.value))
    : String(value || moduleSingular(module.value))
})

watch([title, () => module.value, () => model.value.status], () => {
  if (!module.value) return
  setBreadcrumbs([
    { label: moduleTitle(module.value), to: module.value.path },
    { label: title.value },
  ])
  setBadges(model.value.status ? [{ label: String(model.value.status), color: statusColor(String(model.value.status)) }] : [])
}, { immediate: true })

onBeforeUnmount(clear)
usePageSeo({ title: () => title.value })

const sections = computed(() => {
  if (!module.value) return []
  const groups = groupedFields(module.value)
  if (module.value.collection !== 'documentSequences' || isCreate.value) return groups
  return groups.map(group => ({
    ...group,
    fields: group.fields.map(field => ['documentType', 'year'].includes(field.key) ? { ...field, computed: true } : field),
  }))
})
const compactAdminForm = computed(() =>
  module.value?.collection === 'organizations' || module.value?.collection === 'branches',
)
const stackedDocumentForm = computed(() => module.value?.collection === 'users')
const roleDocumentForm = computed(() => module.value?.collection === 'roles')
const related = computed(() => module.value && !isCreate.value ? store.related(module.value, model.value) : [])
const readOnly = computed(() => {
  if (!module.value) return true
  if (module.value.readOnly) return true
  if (!auth.user?.pageAccess?.includes('ALL_PAGES')) {
    if ((module.value.collection === 'chartOfAccounts' || module.value.collection === 'financialAccounts') && !lcs.can('chart_of_accounts.manage')) return true
    if (module.value.collection === 'organizations' && !lcs.can('organization.update')) return true
    if (module.value.collection === 'branches' && !lcs.can('branch.manage')) return true
    if (module.value.group === 'master' || module.value.group === 'configuration') return true
  }
  if (isRecordReadOnly(module.value.collection, model.value)) return true
  if (module.value.collection === 'quotations' && !lcs.can('quotation.update_draft') && quotationDomainStatus(model.value.status) === 'DRAFT' && !isCreate.value) return true
  if (module.value.collection === 'debitNotes' && !lcs.can('financial_document.update_draft')) return true
  return false
})
const periodClosed = computed(() => {
  if (module.value?.collection !== 'debitNotes') return false
  const period = store.list('accountingPeriods').find(row => row.id === model.value.periodId)
    || store.list('accountingPeriods').find((row) => {
      const day = String(model.value.date || '').slice(0, 10)
      return day && day >= String(row.startDate || '') && day <= String(row.endDate || '')
    })
  return String(period?.status || '') === 'CLOSED'
})
const postingPreview = computed(() => {
  if (module.value?.collection !== 'debitNotes') return null
  const period = store.list('accountingPeriods').find(row => row.id === model.value.periodId)
  const total = asNumber(model.value.total || model.value.amount)
  const type = String(model.value.documentType || 'CUSTOMER_INVOICE')
  const debitAccount = type === 'SUPPLIER_BILL' ? 'Expense / Cost Account' : type === 'CUSTOMER_RECEIPT' ? 'Cash / Bank' : 'Accounts Receivable (1100)'
  const creditAccount = type === 'SUPPLIER_BILL' ? 'Accounts Payable (2010)' : type === 'CUSTOMER_RECEIPT' ? 'Accounts Receivable (1100)' : 'Service Revenue (4010)'
  return { period: String(period?.name || period?.code || model.value.periodId || 'Current open period'), total, debitAccount, creditAccount, difference: 0 }
})
const canMutateRecord = computed(() => Boolean(module.value) && !readOnly.value && !isCreate.value && Boolean(model.value.id))
const deactivationOnly = computed(() => module.value?.group === 'master' || module.value?.collection === 'documentSequences')
const hasDuplicateAction = computed(() => Boolean(module.value?.actions?.some(action => action.key === 'duplicate')))
const headerActions = computed(() => {
  const collection = module.value?.collection
  const status = String(model.value.status || '')
  return (module.value?.actions || []).filter((action) => {
    if (['save', 'delete', 'duplicate'].includes(action.key)) return false
    if (collection === 'quotations') {
      const domain = quotationDomainStatus(status)
      if (action.key === 'saveDraft') return domain === 'DRAFT' && lcs.can('quotation.update_draft')
      if (action.key === 'send') return domain === 'DRAFT' && lcs.can('quotation.send')
      if (action.key === 'accept') return domain === 'SENT' && lcs.can('quotation.accept')
      if (action.key === 'reject') return domain === 'SENT' && lcs.can('quotation.accept')
      if (action.key === 'createRevision') return domain === 'SENT' && lcs.can('quotation.create')
      if (action.key === 'convertJob') return domain === 'ACCEPTED' && lcs.can('quotation.convert')
      if (action.key === 'cancel') return ['DRAFT', 'SENT', 'ACCEPTED'].includes(domain) && (lcs.can('quotation.update_draft') || lcs.can('quotation.accept'))
      if (action.key === 'print') return true
    }
    if (collection === 'debitNotes') {
      const domain = financeDomainStatus(status)
      if (action.key === 'save') return domain === 'DRAFT' && lcs.can('financial_document.update_draft')
      if (action.key === 'post') return domain === 'DRAFT' && lcs.can('financial_document.post') && !periodClosed.value
      if (action.key === 'reverse') return domain === 'POSTED' && lcs.can('financial_document.reverse')
      if (action.key === 'recordPayment') return domain === 'POSTED'
    }
    if (collection === 'jobCharges') {
      if (action.key === 'saveDraft') return status === 'Draft' && lcs.can('service_charge.create')
      if (action.key === 'issue') return status === 'Draft' && lcs.can('service_charge.issue')
      if (action.key === 'createInvoice') return status === 'Issued' && !model.value.financialDocumentId && lcs.can('service_charge.convert_to_invoice')
    }
    if (collection === 'journals') {
      if (action.key === 'postJournal') {
        const lines = Array.isArray(model.value.lines) ? model.value.lines : []
        return String(status).toUpperCase() === 'DRAFT' && lcs.can('journal_entry.post') && lines.length > 0 && asNumber(model.value.debitTotal) > 0 && asNumber(model.value.balanceDifference) === 0
      }
    }
    return true
  })
})

type FreightDocTab = DocumentTabSchema & { fields: FreightField[], kind?: 'fields' | 'lines' | 'related', tableKey?: string }

function tabId(title: string, index: number) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${index}`
}

const tabs = computed<FreightDocTab[]>(() => {
  if (!module.value) return []
  if (stackedDocumentForm.value || roleDocumentForm.value) {
    return [{
      id: 'general',
      labelKey: 'freight.sections.general',
      label: t('freight.sections.general'),
      sections: [{ id: 'general', title: t('freight.sections.general'), fields: [] }],
      fields: module.value.fields,
      kind: 'fields',
    }]
  }
  const items: FreightDocTab[] = sections.value.map((group, index) => ({
    id: tabId(group.title, index),
    labelKey: group.title,
    label: groupTitle(group.title),
    sections: [{
      id: tabId(group.title, index),
      title: groupTitle(group.title),
      fields: [],
    }],
    fields: group.fields,
    kind: 'fields',
  }))
  if (module.value.tables?.length) {
    for (const [index, table] of module.value.tables.entries()) {
      const id = tabId(table.title, index + sections.value.length)
      items.push({ id, labelKey: table.title, label: tableTitle(table), sections: [{ id, title: tableTitle(table), fields: [] }], fields: [], kind: 'lines', tableKey: table.key })
    }
  }
  if (!isCreate.value && related.value.length) {
    items.push({
      id: 'related',
      labelKey: 'Related',
      label: t('freight.ui.related'),
      sections: [{ id: 'related', title: t('freight.ui.related'), fields: [] }],
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
  if (module.value?.collection === 'documentSequences') {
    const active = String(model.value.status || '').toUpperCase() === 'ACTIVE'
    return [[{
      label: t(active ? 'docetra.rowActions.deactivate' : 'docetra.rowActions.activate'),
      icon: active ? 'i-lucide-circle-off' : 'i-lucide-circle-check',
      color: active ? 'warning' as const : 'success' as const,
      onSelect: () => { void setDocumentSequenceStatus(active ? 'INACTIVE' : 'ACTIVE') },
    }]]
  }
  return [[
    ...(!hasDuplicateAction.value ? [{
      label: t('freight.ui.duplicate'),
      icon: 'i-lucide-copy',
      onSelect: () => { void runAction('duplicate') },
    }] : []),
    {
      label: t(deactivationOnly.value ? 'freight.ui.deactivate' : 'freight.ui.delete'),
      icon: deactivationOnly.value ? 'i-lucide-circle-off' : 'i-lucide-trash-2',
      color: deactivationOnly.value ? 'warning' as const : 'error' as const,
      onSelect: () => { void deleteRecord() },
    },
  ]]
})

function setRolePermissions(rows: AppRolePermissionRow[]) {
  const normalized = normalizePermissionRows(rows)
  model.value = {
    ...model.value,
    permissionRows: normalized,
    permissionCount: permissionRowsToFlatKeys(normalized).length,
  }
}

const rolePermissionRows = computed({
  get: () => (Array.isArray(model.value.permissionRows) ? model.value.permissionRows as AppRolePermissionRow[] : []),
  set: (rows: AppRolePermissionRow[]) => setRolePermissions(rows),
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
  if (key === 'allocations') {
    const paymentTotal = asNumber(model.value.total || model.value.amount || model.value.received)
    const allocated = rows.reduce((sum, row) => sum + asNumber(row.amount), 0)
    const exceedsTarget = rows.some(row => asNumber(row.amount) > asNumber(row.targetOutstanding || row.outstandingAmount))
    if (allocated > paymentTotal || exceedsTarget) {
      toast.add({ title: t('freight.ui.allocationExceeds'), color: 'error' })
      return
    }
  }
  model.value = { ...model.value, [key]: rows }
  recalculate()
}

function recalculate() {
  if (!module.value) return
  if (module.value.collection === 'documentSequences') {
    model.value = {
      ...model.value,
      prefix: String(model.value.prefix || '').trimStart(),
      nextNumberPreview: documentSequencePreview(model.value),
    }
  }
  if (module.value.kind === 'quotation') {
    const pricingLines = Array.isArray(model.value.pricingLines) ? model.value.pricingLines as Array<Record<string, unknown>> : []
    if (pricingLines.length) {
      const normalized = pricingLines.map((row) => {
        const rowSubtotal = asNumber(row.subtotal || asNumber(row.quantity) * asNumber(row.unitPrice))
        const rowDiscount = asNumber(row.discountAmount || rowSubtotal * asNumber(row.discountPercent) / 100)
        const taxable = Math.max(0, rowSubtotal - rowDiscount)
        const rowTax = asNumber(row.taxAmount || taxable * asNumber(row.taxPercent) / 100)
        return { ...row, subtotal: Number(rowSubtotal.toFixed(2)), discountAmount: Number(rowDiscount.toFixed(2)), taxAmount: Number(rowTax.toFixed(2)), lineTotal: Number((taxable + rowTax).toFixed(2)) }
      })
      const subtotal = normalized.reduce((sum, row) => sum + asNumber(row.subtotal), 0)
      const discount = normalized.reduce((sum, row) => sum + asNumber(row.discountAmount), 0)
      const tax = normalized.reduce((sum, row) => sum + asNumber(row.taxAmount), 0)
      model.value = { ...model.value, pricingLines: normalized, subtotal: Number(subtotal.toFixed(2)), discount: Number(discount.toFixed(2)), tax: Number(tax.toFixed(2)), total: Number((subtotal - discount + tax).toFixed(2)), amount: Number((subtotal - discount + tax).toFixed(2)) }
    }
    const charges = Array.isArray(model.value.otherCharges) ? model.value.otherCharges as Array<Record<string, unknown>> : []
    const chargeBuy = charges.reduce((sum, row) => sum + asNumber(row.quantity) * asNumber(row.buyingRate), 0)
    const chargeSell = charges.reduce((sum, row) => sum + asNumber(row.amount || asNumber(row.quantity) * asNumber(row.sellingRate)), 0)
    const totalBuying = asNumber(model.value.buying20) + asNumber(model.value.buying40) + asNumber(model.value.buying45) + chargeBuy
    const totalSelling = asNumber(model.value.selling20) + asNumber(model.value.selling40) + asNumber(model.value.selling45) + chargeSell
    const profit = totalSelling - totalBuying
    const pickup = String(model.value.pickup || '')
    const border = String(model.value.border || '')
    const delivery = String(model.value.delivery || '')
    const hasLegacyPricing = charges.length > 0 || ['buying20', 'buying40', 'buying45', 'selling20', 'selling40', 'selling45'].some(key => asNumber(model.value[key]) !== 0)
    model.value = {
      ...model.value,
      route: [pickup, border, delivery].filter(Boolean).join(' → '),
      ...(hasLegacyPricing ? {
        totalBuying: Number(totalBuying.toFixed(2)),
        totalSelling: Number(totalSelling.toFixed(2)),
        amount: Number(totalSelling.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: totalSelling ? Number(((profit / totalSelling) * 100).toFixed(1)) : 0,
      } : {}),
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
  if (module.value.collection === 'jobCharges' && Array.isArray(model.value.feeLines)) {
    const lines = model.value.feeLines as Array<Record<string, unknown>>
    const subtotal = lines.reduce((sum, row) => sum + asNumber(row.quantity) * asNumber(row.unitAmount), 0)
    const discount = lines.reduce((sum, row) => sum + asNumber(row.discount), 0)
    const tax = lines.reduce((sum, row) => sum + asNumber(row.taxAmount || row.tax), 0)
    const total = subtotal - discount + tax
    model.value = { ...model.value, subtotal: Number(subtotal.toFixed(2)), discount: Number(discount.toFixed(2)), tax: Number(tax.toFixed(2)), total: Number(total.toFixed(2)), amount: Number(total.toFixed(2)) }
  }
  if (module.value.collection === 'debitNotes' && Array.isArray(model.value.lines)) {
    const lines = model.value.lines as Array<Record<string, unknown>>
    const subtotal = lines.reduce((sum, row) => sum + asNumber(row.quantity) * asNumber(row.unitAmount), 0)
    const discount = lines.reduce((sum, row) => sum + asNumber(row.discount), 0)
    const tax = lines.reduce((sum, row) => sum + asNumber(row.taxAmount || row.tax), 0)
    model.value = { ...model.value, amount: Number((subtotal - discount).toFixed(2)), vat: Number(tax.toFixed(2)), total: Number((subtotal - discount + tax).toFixed(2)) }
  }
  if (module.value.collection === 'journals' && Array.isArray(model.value.lines)) {
    const lines = model.value.lines as Array<Record<string, unknown>>
    const debitTotal = lines.reduce((sum, row) => sum + asNumber(row.debit_amount), 0)
    const creditTotal = lines.reduce((sum, row) => sum + asNumber(row.credit_amount), 0)
    model.value = { ...model.value, debitTotal: Number(debitTotal.toFixed(2)), creditTotal: Number(creditTotal.toFixed(2)), balanceDifference: Number((debitTotal - creditTotal).toFixed(2)) }
  }
  if (module.value.path.includes('customer-payments') || String(model.value.documentType) === 'CUSTOMER_RECEIPT') {
    const allocations = Array.isArray(model.value.allocations) ? model.value.allocations as Array<Record<string, unknown>> : []
    const allocatedAmount = allocations.reduce((sum, row) => sum + asNumber(row.amount), 0)
    const unallocatedAmount = Math.max(0, asNumber(model.value.received) - allocatedAmount)
    const outstanding = asNumber(model.value.amountDue) - asNumber(model.value.received)
    let status = String(model.value.status || 'Unpaid')
    if (outstanding <= 0 && asNumber(model.value.received) > 0) status = 'Paid'
    else if (asNumber(model.value.received) > 0) status = 'Partial'
    model.value = { ...model.value, outstanding: Number(outstanding.toFixed(2)), allocatedAmount: Number(allocatedAmount.toFixed(2)), unallocatedAmount: Number(unallocatedAmount.toFixed(2)), status }
  }
}

async function save(status?: string) {
  if (!module.value || readOnly.value) return
  saving.value = true
  try {
    recalculate()
    const payload = { ...model.value }
    if (status) payload.status = status
    if (module.value.collection === 'documentSequences') {
      payload.prefix = String(payload.prefix || '').trim()
      const sequenceYear = Number(payload.year)
      const lastValue = Number(payload.lastValue)
      const paddingLength = Number(payload.paddingLength)
      payload.year = sequenceYear
      payload.lastValue = lastValue
      payload.paddingLength = paddingLength
      payload.status = String(payload.status || 'ACTIVE').toUpperCase()
      payload.nextNumberPreview = documentSequencePreview(payload)

      if (!Number.isInteger(sequenceYear) || sequenceYear < 1000 || sequenceYear > 9999) {
        toast.add({ title: 'Year must be a positive 4-digit year.', color: 'error' })
        return
      }
      if (!Number.isInteger(lastValue) || lastValue < 0) {
        toast.add({ title: 'Last Value must be a whole number greater than or equal to 0.', color: 'error' })
        return
      }
      if (!Number.isInteger(paddingLength) || paddingLength <= 0) {
        toast.add({ title: 'Padding Length must be a whole number greater than 0.', color: 'error' })
        return
      }
      if (!['ACTIVE', 'INACTIVE'].includes(String(payload.status))) {
        toast.add({ title: 'Status must be ACTIVE or INACTIVE.', color: 'error' })
        return
      }
      const duplicate = store.list('documentSequences').find(row =>
        String(row.id) !== String(payload.id || '')
        && String(row.documentType) === String(payload.documentType)
        && Number(row.year) === Number(payload.year),
      )
      if (duplicate) {
        toast.add({
          title: 'A document sequence already exists for this document type and year.',
          description: `${documentSequenceTypeLabel(payload.documentType)} / ${payload.year}`,
          color: 'error',
        })
        return
      }
      if (!isCreate.value && originalModel.value && Number(payload.lastValue) !== Number(originalModel.value.lastValue)) {
        const ok = await confirm({
          kind: 'generic',
          title: 'Change the last sequence value?',
          description: 'Changing the last value can create duplicate or skipped document numbers. Continue only after verifying the numbering history.',
          confirmLabel: 'Change Last Value',
          confirmColor: 'warning',
        })
        if (!ok) return
      }
    }
    const missing = module.value.fields.filter(field => field.required && !field.computed && !String(payload[field.key] ?? '').trim())
    if (missing.length) {
      toast.add({ title: t('freight.ui.missingRequired'), description: missing.map(fieldLabel).join(', '), color: 'error' })
      return
    }
    if (isCreate.value || !payload.id) {
      const sequenceTypes: Record<string, { type: string, fallback: string }> = {
        quotations: { type: 'QUOTATION', fallback: 'Q' },
        jobCharges: { type: 'SERVICE_CHARGE', fallback: 'SC' },
        debitNotes: { type: String(payload.documentType || 'CUSTOMER_INVOICE'), fallback: 'INV' },
        journals: { type: 'JOURNAL', fallback: 'JE' },
      }
      const sequenceInfo = sequenceTypes[module.value.collection]
      if (sequenceInfo && !String(payload[module.value.titleField] || '').trim()) {
        const currentYear = new Date().getFullYear()
        const sequence = store.list('documentSequences').find(row =>
          String(row.documentType) === sequenceInfo.type
          && Number(row.year) === currentYear
          && String(row.status).toUpperCase() === 'ACTIVE',
        )
        const next = Number(sequence?.lastValue || store.list(module.value.collection).length) + 1
        payload[module.value.titleField] = `${sequence?.prefix || sequenceInfo.fallback}-${currentYear}-${String(next).padStart(Number(sequence?.paddingLength || 6), '0')}`
        if (sequence) store.save('documentSequences', { ...sequence, lastValue: next })
      }
      payload.createdAt ||= new Date().toISOString()
      payload.createdBy ||= String(currentUser.value?.name || 'Current User')
      payload.status ||= module.value.collection === 'journals' ? 'DRAFT' : 'Draft'
      payload.currency ||= 'USD'
    }
    const saved = isCreate.value || !payload.id
      ? store.create(module.value.collection, payload, module.value.collection.slice(0, 3))
      : store.save(module.value.collection, payload as FreightRecord)
    store.addAudit(status ? `Set status ${status}` : 'Saved', module.value.title, String(saved[module.value.titleField] || saved.id))
    toast.add({ title: t('freight.ui.save'), color: 'success' })
    if (isCreate.value) await navigateTo(`${module.value.path}/${saved.id}`)
    else {
      model.value = saved
      originalModel.value = { ...saved }
    }
  }
  catch (error) {
    if (isLcsDomainError(error)) toast.add({ title: error.message, color: 'error' })
    else throw error
  }
  finally {
    saving.value = false
  }
}

async function setDocumentSequenceStatus(status: 'ACTIVE' | 'INACTIVE') {
  if (module.value?.collection !== 'documentSequences' || !canMutateRecord.value) return
  model.value = store.save(module.value.collection, { ...model.value, status })
  originalModel.value = { ...model.value }
  store.addAudit(status === 'ACTIVE' ? 'Activated' : 'Deactivated', module.value.title, String(model.value.documentType || model.value.id))
  toast.add({ title: t(status === 'ACTIVE' ? 'docetra.common.activated' : 'docetra.common.deactivated'), color: 'success' })
}

async function runAction(key: string) {
  if (!module.value) return
  try {
  if (key === 'save' || key === 'saveDraft') return save(key === 'saveDraft' ? 'Draft' : undefined)
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
      toast.add({ title: t('freight.ui.duplicated'), color: 'success' })
      await navigateTo(`${module.value.path}/${copy.id}`)
    }
    return
  }
  if (key === 'send' && module.value.collection === 'quotations') {
    const saved = await lcs.runCommand('quotation.send', String(model.value.id), keyValue =>
      lcs.quotations.send(String(model.value.id), keyValue),
    )
    model.value = saved
    toast.add({ title: t('freight.ui.quotationSent'), color: 'success' })
    return
  }
  if (key === 'accept' && module.value.collection === 'quotations') {
    const saved = await lcs.runCommand('quotation.accept', String(model.value.id), keyValue =>
      lcs.quotations.accept(String(model.value.id), keyValue),
    )
    model.value = saved
    toast.add({ title: t('freight.ui.quotationAccepted'), color: 'success' })
    return
  }
  if ((key === 'reject' || key === 'cancel') && module.value.collection === 'quotations') {
    const nextStatus = key === 'reject' ? 'Rejected' : 'Cancelled'
    model.value = store.save('quotations', { ...model.value, status: nextStatus })
    store.addAudit(key === 'reject' ? 'Rejected quotation' : 'Cancelled quotation', 'Quotations', String(model.value.quotationNo || model.value.id))
    toast.add({ title: t(key === 'reject' ? 'freight.ui.quotationRejected' : 'freight.ui.quotationCancelled'), color: key === 'reject' ? 'error' : 'warning' })
    return
  }
  if (key === 'createRevision' && module.value.collection === 'quotations') {
    const created = await lcs.quotations.createRevision(String(model.value.id))
    store.reload()
    toast.add({ title: t('freight.ui.revisionCreated'), color: 'success' })
    await navigateTo(`/quotations/${created.id}`)
    return
  }
  if (key === 'convertJob') {
    const job = await lcs.runCommand('quotation.convert', String(model.value.id), keyValue =>
      lcs.quotations.convert(String(model.value.id), keyValue),
    )
    toast.add({ title: t('freight.ui.convertedToJob'), color: 'success' })
    await navigateTo(`/service-orders/${job.id}`)
    return
  }
  if (key === 'issue' && module.value.collection === 'jobCharges') {
    const saved = await lcs.runCommand('charge.issue', String(model.value.id), keyValue =>
      lcs.charges.issue(String(model.value.id), keyValue),
    )
    model.value = saved
    toast.add({ title: t('freight.ui.chargeIssued'), description: t('lcs.finance.chargeNoPost'), color: 'success' })
    return
  }
  if (key === 'createInvoice' && module.value.collection === 'jobCharges') {
    const invoice = await lcs.runCommand('charge.create-invoice', String(model.value.id), keyValue =>
      lcs.charges.createFinanceInvoice(String(model.value.id), keyValue),
    )
    toast.add({ title: t('freight.ui.draftInvoiceCreated'), color: 'success' })
    await navigateTo(`/finance/documents/${invoice.id}`)
    return
  }
  if (key === 'post' && module.value.collection === 'debitNotes') {
    if (periodClosed.value) {
      toast.add({ title: t('lcs.finance.periodClosed'), color: 'error' })
      return
    }
    const saved = await lcs.runCommand('finance.post', String(model.value.id), keyValue =>
      lcs.finance.post(String(model.value.id), keyValue),
    )
    model.value = saved
    toast.add({ title: t('freight.ui.documentPosted'), color: 'success' })
    return
  }
  if (key === 'postJournal' && module.value.collection === 'journals') {
    recalculate()
    const lines = Array.isArray(model.value.lines) ? model.value.lines : []
    if (!lines.length || asNumber(model.value.debitTotal) <= 0 || asNumber(model.value.balanceDifference) !== 0) {
      toast.add({ title: t('freight.ui.journalUnbalanced'), color: 'error' })
      return
    }
    model.value = store.save('journals', { ...model.value, status: 'POSTED', postedBy: currentUser.value.name, postedAt: new Date().toISOString() })
    store.addAudit('Posted journal', 'Journal Entries', String(model.value.entryNo || model.value.id))
    toast.add({ title: t('freight.ui.journalPosted'), color: 'success' })
    return
  }
  if (key === 'reverse' && module.value.collection === 'debitNotes') {
    const reason = window.prompt(t('lcs.finance.reverseReason')) || ''
    const saved = await lcs.runCommand('finance.reverse', String(model.value.id), keyValue =>
      lcs.finance.reverse(String(model.value.id), reason, keyValue),
    )
    model.value = saved
    toast.add({ title: t('freight.ui.documentReversed'), color: 'success' })
    return
  }
  if (key === 'delete') return deleteRecord()
  if (key === 'recordPayment') {
    await navigateTo({
      path: '/finance/documents/new',
      query: {
        documentType: 'CUSTOMER_RECEIPT',
        customer: String(model.value.customer || ''),
        jobNo: String(model.value.jobNo || ''),
        debitNoteNo: String(model.value.debitNoteNo || ''),
        amountDue: String(model.value.total || model.value.amount || ''),
      },
    })
  }
  }
  catch (error) {
    lcs.reportError(error)
  }
}

async function deleteRecord() {
  if (!module.value || !canMutateRecord.value) return
  if (deactivationOnly.value) {
    model.value = store.save(module.value.collection, { ...model.value, status: module.value.collection === 'documentSequences' ? 'INACTIVE' : 'Inactive' })
    store.addAudit('Deactivated', module.value.title, String(model.value[module.value.titleField] || model.value.id))
    toast.add({ title: t('freight.ui.recordDeactivated'), color: 'success' })
    return
  }
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
    :show-tabs="stackedDocumentForm || (!compactAdminForm && !roleDocumentForm && tabs.length > 1)"
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
        :label="actionLabel(action)"
        :loading="saving"
        class="rounded-md"
        @click="runAction(action.key)"
      />
    </template>

    <template #form>
      <DocumentAppDocumentContentShell wide>
        <div class="space-y-8 py-6">
          <UAlert
            v-if="module.collection === 'jobCharges'"
            color="warning"
            variant="subtle"
            icon="i-lucide-info"
            :title="$t('lcs.finance.chargeNoPost')"
            :description="$t('lcs.finance.chargeVsInvoice')"
          />
          <UCard v-if="postingPreview && String(model.status) === 'Draft'" variant="subtle">
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-highlighted">Posting confirmation</p>
                  <p class="text-xs text-muted">Review the resolved accounting effect before posting.</p>
                </div>
                <UBadge :color="periodClosed ? 'error' : 'success'" variant="subtle">{{ periodClosed ? 'Period closed' : postingPreview.period }}</UBadge>
              </div>
            </template>
            <div class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div><p class="text-xs text-muted">Document total</p><p class="font-semibold">{{ postingPreview.total.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</p></div>
              <div><p class="text-xs text-muted">Debit account</p><p class="font-medium">{{ postingPreview.debitAccount }}</p></div>
              <div><p class="text-xs text-muted">Credit account</p><p class="font-medium">{{ postingPreview.creditAccount }}</p></div>
              <div><p class="text-xs text-muted">Branch dimension</p><p class="font-medium">{{ model.branchName || 'Active branch' }}</p></div>
              <div><p class="text-xs text-muted">Balance difference</p><p class="font-semibold text-success">{{ postingPreview.difference.toFixed(2) }}</p></div>
            </div>
          </UCard>
          <UAlert
            v-if="module.collection === 'quotations' && readOnly"
            color="neutral"
            variant="subtle"
            icon="i-lucide-lock"
            :title="$t('lcs.quotation.readOnly')"
            :description="$t('lcs.quotation.createRevisionHint')"
          />
          <UAlert
            v-if="module.collection === 'debitNotes' && periodClosed"
            color="error"
            variant="subtle"
            icon="i-lucide-calendar-off"
            :title="$t('lcs.finance.periodClosed')"
          />
          <UAlert
            v-if="module.collection === 'debitNotes' && String(model.status) === 'Posted'"
            color="neutral"
            variant="subtle"
            icon="i-lucide-lock"
            :title="$t('lcs.finance.postedReadOnly')"
          />
          <div v-if="roleDocumentForm" class="space-y-8">
            <section class="space-y-4">
              <h3 class="text-sm font-medium text-highlighted">
                {{ $t('docetra.sections.main') }}
              </h3>
              <div class="grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
                <div
                  v-for="field in roleMainFields"
                  :key="field.key"
                  class="min-w-0 max-w-full"
                  :class="field.colSpan === 2 || field.type === 'textarea' ? 'sm:col-span-2' : ''"
                >
                  <DocumentAppDynamicFieldRenderer
                    :field="field"
                    :model-value="fieldValue(field.key)"
                    :disabled="readOnly"
                    @update:model-value="(value) => setField(field.key, value)"
                  />
                </div>
              </div>
            </section>
            <section class="space-y-4">
              <h3 class="text-sm font-medium text-highlighted">
                {{ $t('docetra.sections.permissions') }}
              </h3>
              <CommonAppRolePermissionMatrix
                v-model="rolePermissionRows"
                :disabled="readOnly"
              />
            </section>
          </div>

          <div v-else-if="stackedDocumentForm" class="space-y-6">
            <section
              v-for="group in sections"
              :key="group.title"
              class="overflow-hidden rounded-lg border border-default"
            >
              <div class="border-b border-default bg-elevated/50 px-4 py-2.5">
                <h3 class="text-sm font-semibold text-highlighted">
                  {{ groupTitle(group.title) }}
                </h3>
              </div>
              <div class="p-4 sm:p-5">
                <FreightFieldGrid
                  :fields="group.fields"
                  :model="model"
                  :disabled="readOnly"
                  @update="setField"
                />
              </div>
            </section>
            <section
              v-for="table in module.tables || []"
              :key="table.key"
              class="overflow-hidden rounded-lg border border-default p-4 sm:p-5"
            >
              <FreightLineTable
                :table="table"
                :model-value="(Array.isArray(model[table.key]) ? model[table.key] : []) as Array<Record<string, unknown>>"
                :disabled="readOnly"
                @update:model-value="setTable(table.key, $event)"
              />
            </section>
          </div>

          <section v-else-if="currentTab?.kind === 'fields'" class="space-y-4">
            <h3
              v-if="!compactAdminForm && tabs.length > 1"
              class="text-lg font-semibold text-highlighted"
            >
              {{ currentTab.label }}
            </h3>
            <FreightFieldGrid
              :fields="currentTab.fields"
              :model="model"
              :disabled="readOnly"
              @update="setField"
            />
          </section>

          <div v-else-if="currentTab?.kind === 'lines'" class="space-y-6">
            <h3 class="text-lg font-semibold text-highlighted">
              {{ currentTab.label }}
            </h3>
            <FreightLineTable
              v-for="table in (module.tables || []).filter(item => !currentTab?.tableKey || item.key === currentTab?.tableKey)"
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
