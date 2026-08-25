<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { usePageSeo } from '~/composables/usePageSeo'
import { formatFreightCell, statusColor } from '~/composables/freight/useFreight'
import { isNumericKey, jobWorkspacePath, workspaceSectionForPath } from '~/utils/freight/job-workspace'
import { freightTableUi } from '~/utils/table/theme'

const store = useFreightStore()
const { t } = useI18n()
const { setTitle, clear } = useAppHeader()
const UBadge = resolveComponent('UBadge')
const ULink = resolveComponent('ULink')

setTitle(t('freight.pages.dashboard'))
watch(() => t('freight.pages.dashboard'), title => setTitle(title))
onBeforeUnmount(clear)
usePageSeo({ title: () => t('freight.pages.dashboard') })

const data = computed(() => store.dashboard)
const summaryKpis = computed(() => data.value?.kpis || [])

function colHeader(key: string) {
  return t(`freight.ui.cols.${key === 'etaFactory' ? 'eta' : key}`)
}

function makeColumns(keys: readonly string[], section: ReturnType<typeof workspaceSectionForPath> | 'overview' = 'overview') {
  return computed<TableColumn<Record<string, unknown>>[]>(() =>
    keys.map((key, index) => ({
      accessorKey: key,
      header: colHeader(key),
      enableSorting: false,
      meta: isNumericKey(key)
        ? { class: { td: 'text-end tabular-nums whitespace-nowrap', th: 'text-end' } }
        : undefined,
      cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
        const value = row.original[key]
        const text = formatFreightCell(value, key)
        if (key === 'status' || key === 'direction') {
          return h(UBadge, {
            color: key === 'status' ? statusColor(String(value || '')) : 'info',
            variant: 'subtle',
          }, () => text)
        }
        if (key === 'jobNo') {
          const job = store.getJobByNo(String(value || ''))
          if (job) {
            return h(ULink, {
              to: jobWorkspacePath(job.id, section === 'overview' ? 'overview' : section),
              class: 'font-medium text-highlighted hover:text-primary hover:underline',
            }, () => text)
          }
        }
        if (index === 0 && row.original.id && key === 'jobNo') {
          return text
        }
        return text
      },
    })),
  )
}

const jobColumns = makeColumns(['jobNo', 'customer', 'direction', 'containerNo', 'etaFactory', 'status'], 'overview')
const customsColumns = makeColumns(['jobNo', 'customsNo', 'status'], 'components')
const receivableColumns = makeColumns(['jobNo', 'customer', 'outstanding', 'status'], 'financial-documents')
const payableColumns = makeColumns(['jobNo', 'supplier', 'outstanding', 'status'], 'financial-documents')

function openJob(section: ReturnType<typeof workspaceSectionForPath> = 'overview') {
  return (_event: Event, row: TableRow<Record<string, unknown>>) => {
    const job = store.getJobByNo(String(row.original.jobNo || '')) || store.get('jobs', String(row.original.id || ''))
    if (job) navigateTo(jobWorkspacePath(job.id, section))
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-auto bg-muted/20">
    <LayoutAppHeaderPageActions :can-create="false" @refresh="store.reload()" />

    <div class="flex w-full min-w-0 flex-1 flex-col gap-3 px-1.5 pt-1.5 pb-3">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <CommonAppSummaryCard
          v-for="kpi in summaryKpis"
          :key="kpi.id"
          :title="t(`freight.kpis.${kpi.id}`)"
          :value="kpi.value"
          :to="kpi.to"
        />
      </div>

      <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <section class="overflow-hidden rounded-md border border-default bg-default">
          <div class="flex items-center justify-between border-b border-default px-3 py-2">
            <h2 class="text-sm font-semibold text-highlighted">{{ t('freight.ui.activeJobs') }}</h2>
            <UButton size="xs" variant="ghost" to="/service-orders" trailing-icon="i-lucide-arrow-up-right">
              {{ t('freight.ui.viewAll') }}
            </UButton>
          </div>
          <div v-if="data.recentJobs.length" class="overflow-x-auto p-2">
            <UTable
              :data="data.recentJobs"
              :columns="jobColumns"
              :get-row-id="(row: Record<string, unknown>) => String(row.id || '')"
              class="freight-table min-w-max"
              :ui="freightTableUi"
              @select="openJob('overview')"
            />
          </div>
          <UEmpty v-else variant="naked" size="sm" icon="i-lucide-container" :title="t('freight.ui.noActiveJobs')" class="py-8" />
        </section>

        <section class="overflow-hidden rounded-md border border-default bg-default">
          <div class="flex items-center justify-between border-b border-default px-3 py-2">
            <h2 class="text-sm font-semibold text-highlighted">{{ t('freight.ui.customsPending') }}</h2>
            <UButton size="xs" variant="ghost" to="/service-orders" trailing-icon="i-lucide-arrow-up-right">
              {{ t('freight.ui.viewAll') }}
            </UButton>
          </div>
          <div v-if="data.customsPending.length" class="overflow-x-auto p-2">
            <UTable
              :data="data.customsPending"
              :columns="customsColumns"
              :get-row-id="(row: Record<string, unknown>) => String(row.id || '')"
              class="freight-table min-w-max"
              :ui="freightTableUi"
              @select="openJob('components')"
            />
          </div>
          <UEmpty v-else variant="naked" size="sm" icon="i-lucide-stamp" :title="t('freight.ui.noPendingCustoms')" class="py-8" />
        </section>

        <section class="overflow-hidden rounded-md border border-default bg-default">
          <div class="flex items-center justify-between border-b border-default px-3 py-2">
            <h2 class="text-sm font-semibold text-highlighted">{{ t('freight.ui.receivable') }}</h2>
            <UButton size="xs" variant="ghost" to="/reports" trailing-icon="i-lucide-arrow-up-right">
              {{ t('freight.ui.viewAll') }}
            </UButton>
          </div>
          <div v-if="data.receivableRows.length" class="overflow-x-auto p-2">
            <UTable
              :data="data.receivableRows"
              :columns="receivableColumns"
              :get-row-id="(row: Record<string, unknown>) => String(row.id || '')"
              class="freight-table min-w-max"
              :ui="freightTableUi"
              @select="openJob('financial-documents')"
            />
          </div>
          <UEmpty v-else variant="naked" size="sm" icon="i-lucide-circle-dollar-sign" :title="t('freight.ui.noReceivables')" class="py-8" />
        </section>

        <section class="overflow-hidden rounded-md border border-default bg-default">
          <div class="flex items-center justify-between border-b border-default px-3 py-2">
            <h2 class="text-sm font-semibold text-highlighted">{{ t('freight.ui.payable') }}</h2>
            <UButton size="xs" variant="ghost" to="/reports" trailing-icon="i-lucide-arrow-up-right">
              {{ t('freight.ui.viewAll') }}
            </UButton>
          </div>
          <div v-if="data.payableRows.length" class="overflow-x-auto p-2">
            <UTable
              :data="data.payableRows"
              :columns="payableColumns"
              :get-row-id="(row: Record<string, unknown>) => String(row.id || '')"
              class="freight-table min-w-max"
              :ui="freightTableUi"
              @select="openJob('financial-documents')"
            />
          </div>
          <UEmpty v-else variant="naked" size="sm" icon="i-lucide-wallet-cards" :title="t('freight.ui.noPayables')" class="py-8" />
        </section>
      </div>
    </div>
  </div>
</template>
