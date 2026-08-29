<script setup lang="ts">
import { printTemplateById, defaultPrintTemplate, supportedPrintTemplates, type PrintTemplateId } from '~/config/print-templates'
import { buildPrintViewModel, type PrintViewModel } from '~/utils/freight/print-model'
import { buildQuotationPrintViewModel } from '~/utils/freight/quotation-print'
import { useSettingsRepositories } from '~/repositories'
import { useAppLocalization } from '~/composables/settings/useAppLocalization'
import { freightModules } from '~/config/freight-modules'

const route = useRoute()
const router = useRouter()
const store = useFreightStore()
const auth = useAuthStore()
const { t } = useI18n()
const { formatDateTime } = useAppLocalization()

const collection = computed(() => String(route.params.collection || ''))
const recordId = computed(() => String(route.params.id || ''))

const module = computed(() => freightModules.find(item => item.collection === collection.value) || null)
const record = computed(() => store.get(collection.value, recordId.value))
const accessDenied = computed(() => Boolean(module.value && !auth.canAccessPage(module.value.permission)))
const notFound = computed(() => Boolean(collection.value && recordId.value) && !record.value)

const templateId = computed<PrintTemplateId>({
  get: () => {
    const requested = String(route.query.template || '')
    return printTemplateById(requested) && supportedPrintTemplates(collection.value).some(tpl => tpl.id === requested)
      ? requested as PrintTemplateId
      : defaultPrintTemplate(collection.value, record.value)
  },
  set: (value) => {
    void router.replace({ query: { ...route.query, template: value } })
  },
})

const logoUrl = ref('')

onMounted(async () => {
  try {
    const info = await useSettingsRepositories().appInfo.get()
    logoUrl.value = String(info?.branding?.mainLogoUrl || '')
  }
  catch {
    logoUrl.value = ''
  }
})

/** Local currency from the organization's configured default, never hardcoded. */
const localCurrency = computed(() => {
  const org = (store.list('organizations') || [])[0]
  return String(org?.defaultCurrency || 'USD')
})

const containerIndex = computed(() => {
  const raw = route.query.container
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
})

const viewModel = computed<PrintViewModel | null>(() => {
  if (!record.value) return null
  const context = {
    organizations: store.list('organizations'),
    branches: store.list('branches'),
    companies: store.list('companies'),
    suppliers: store.list('suppliers'),
    jobs: store.list('jobs'),
    financialAccounts: store.list('financialAccounts'),
    logoUrl: logoUrl.value,
    localCurrency: localCurrency.value,
  }
  if (collection.value === 'quotations') {
    return buildQuotationPrintViewModel(record.value, templateId.value, context, {
      containerIndex: containerIndex.value,
    })
  }
  return buildPrintViewModel(record.value, templateId.value, context)
})

const templateOptions = computed(() => supportedPrintTemplates(collection.value).map(template => ({
  label: t(template.labelKey),
  value: template.id,
})))

const zoom = ref(100)
const zoomOptions = [50, 75, 100, 125, 150].map(value => ({ label: `${value}%`, value }))

const printDate = computed(() => formatDateTime(new Date().toISOString(), ''))
const printUser = computed(() => String(auth.user?.name || ''))

const watermarkLabel = computed(() => {
  const watermark = viewModel.value?.watermark
  if (!watermark) return ''
  return t(`freight.print.watermark.${watermark.toLowerCase()}`)
})

const backPath = computed(() => {
  if (!module.value) return '/'
  if (collection.value === 'quotations' && recordId.value) {
    return `${module.value.path}/${recordId.value}`
  }
  return module.value.path
})

async function goBack() {
  await navigateTo(backPath.value)
}

/** Print only after all paper assets (e.g. the logo) finished loading. */
async function printNow() {
  if (!import.meta.client) return
  const images = Array.from(document.querySelectorAll<HTMLImageElement>('.print-paper img'))
  await Promise.all(images.map(img => img.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true })
        img.addEventListener('error', () => resolve(), { once: true })
      })))
  window.print()
}

const statusLabel = computed(() => String(viewModel.value?.document.status || ''))
</script>

<template>
  <div class="print-page min-h-0">
    <header class="print-toolbar flex items-center gap-2 border-b border-default bg-default px-3 py-2">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-arrow-left"
        :label="t('freight.print.back')"
        @click="goBack"
      />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-highlighted">
          {{ viewModel?.document.number || recordId }}
        </p>
        <p class="truncate text-xs text-muted">
          {{ viewModel?.issuer.legalName }} · {{ statusLabel }}
        </p>
      </div>
      <USelect
        v-model="templateId"
        :items="templateOptions"
        size="sm"
        class="w-44"
        :aria-label="t('freight.print.template')"
      />
      <USelect
        v-model="zoom"
        :items="zoomOptions"
        size="sm"
        class="w-24"
        :aria-label="t('freight.print.zoom')"
      />
      <UButton
        color="primary"
        size="sm"
        icon="i-lucide-printer"
        :label="t('freight.print.print')"
        :disabled="!viewModel"
        @click="printNow"
      />
    </header>

    <div v-if="accessDenied" class="p-6 text-sm text-muted">
      {{ t('docetra.errors.forbidden') || t('freight.print.back') }}
    </div>
    <div v-else-if="notFound || !viewModel" class="p-6 text-sm text-muted">
      {{ t('docetra.document.notFound') || 'Record not found.' }}
    </div>

    <div v-else class="preview-scroll min-h-0 flex-1 overflow-auto bg-gray-200 p-4 dark:bg-gray-950 print:p-0 print:bg-white">
      <div
        class="mx-auto w-fit"
        :style="{ zoom: `${zoom}%` }"
      >
        <div class="relative bg-white shadow-lg print:shadow-none print:mx-0">
          <div
            v-if="watermarkLabel"
            class="watermark pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            aria-hidden="true"
          >
            <span class="watermark-text text-7xl font-black uppercase tracking-widest text-gray-900 opacity-[0.08]">
              {{ watermarkLabel }}
            </span>
          </div>

          <PrintTaxInvoiceLayout
            v-if="templateId === 'tax-invoice'"
            :model="viewModel"
            :print-date="printDate"
            :print-user="printUser"
          />
          <PrintDebitNoteLayout
            v-else-if="templateId === 'debit-note'"
            :model="viewModel"
            :print-date="printDate"
            :print-user="printUser"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.print-paper {
  color: #111827;
}

.print-paper--landscape {
  width: 297mm;
  min-height: 210mm;
  padding: 10mm 8mm 14mm;
}

.print-paper--portrait {
  width: 210mm;
  min-height: 297mm;
  padding: 12mm 12mm 16mm;
}

@media print {
  .print-toolbar {
    display: none !important;
  }

  .print-page {
    display: block;
    min-height: 0;
    background: white;
  }

  .preview-scroll {
    overflow: visible !important;
    padding: 0 !important;
    background: white !important;
  }

  .preview-scroll > div {
    zoom: 1 !important;
    width: auto !important;
  }

  .watermark-text {
    opacity: 0.08 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
