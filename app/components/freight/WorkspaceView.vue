<script setup lang="ts">
import type { DropdownMenuItem, TableColumn, TableRow } from '@nuxt/ui'
import type { PaginationState } from '@tanstack/vue-table'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { h, resolveComponent } from 'vue'
import { useAppHeader } from '~/composables/layout/useAppHeader'
import { useConfirm } from '~/composables/common/useConfirm'
import { usePageSeo } from '~/composables/usePageSeo'
import {
  asNumber,
  statusColor,
  useFreightLabel,
  useFreightRouteModule,
} from '~/composables/freight/useFreight'
import { getFilterSelectUi, isFilterValueActive } from '~/utils/filter/select-ui'
import { parsePageLimit, TABLE_PAGE_SIZES } from '~/utils/pagination'
import { freightTableUi, freightTableCheckboxMeta, TABLE_VIRTUALIZE_AFTER } from '~/utils/table/theme'

const { module } = useFreightRouteModule()
const store = useFreightStore()
const { t } = useI18n()
const { km, fieldLabel, moduleTitle, moduleSingular } = useFreightLabel()
const { setTitle, setBreadcrumbs, clear } = useAppHeader()
const { confirm } = useConfirm()
const toast = useToast()
const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UIcon = resolveComponent('UIcon')
const ULink = resolveComponent('ULink')

const q = ref('')
const pagination = ref<PaginationState>({ pageIndex: 0, pageSize: 20 })
const filters = reactive<Record<string, string>>({})
const rowSelection = ref<Record<string, boolean>>({})
const pending = ref(false)
const dateFrom = ref('')
const dateTo = ref('')

const current = computed(() => module.value)
const canCreate = computed(() => Boolean(current.value?.canCreate) && !current.value?.readOnly)
const canMutate = computed(() => Boolean(current.value) && !current.value?.readOnly)
const dateField = computed(() => {
  const fields = current.value?.fields || []
  return fields.find(field => field.type === 'date' || field.type === 'datetime' || field.key === 'date' || /date$/i.test(field.key))?.key
    || current.value?.columns.find(column => /date/i.test(column.key))?.key
})

const result = computed(() => {
  if (!current.value) return { rows: [], total: 0, all: [] }
  pending.value = false
  return store.query(current.value, {
    q: q.value,
    filters,
    paginate: false,
    dateField: dateField.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
  })
})
const selectedIds = computed(() => Object.keys(rowSelection.value).filter(id => rowSelection.value[id]))
const tableScrollEl = ref<HTMLElement | null>(null)
const virtualize = computed(() => {
  const count = result.value.total
  if (count < TABLE_VIRTUALIZE_AFTER && pagination.value.pageSize < TABLE_VIRTUALIZE_AFTER) return false
  return {
    estimateSize: 48,
    overscan: 12,
    getScrollElement: () => tableScrollEl.value,
  }
})
const paginationOptions = { getPaginationRowModel: getPaginationRowModel() }

const route = useRoute()

watch(current, (value) => {
  if (!value) return
  setTitle(moduleTitle(value))
  setBreadcrumbs([{ label: moduleTitle(value) }])
  rowSelection.value = {}
  for (const filter of value.filters || []) {
    const fromQuery = String(route.query[filter.key] || '')
    filters[filter.key] = fromQuery || filters[filter.key] || ''
  }
}, { immediate: true })

onBeforeUnmount(clear)

usePageSeo({
  title: () => current.value ? moduleTitle(current.value) : t('freight.pages.dashboard'),
})

watch([q, filters, dateFrom, dateTo], () => {
  rowSelection.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
}, { deep: true })

function recordPath(id: unknown) {
  if (!current.value) return '/'
  return `${current.value.path}/${id}`
}

function cellText(row: Record<string, unknown>, key: string) {
  const value = row[key]
  if (Array.isArray(value)) return value.join(', ') || '—'
  if (typeof value === 'number') return asNumber(value).toLocaleString()
  const text = String(value ?? '').trim()
  return text || '—'
}

function rowStamp(row: Record<string, unknown>) {
  return String(row.updatedAt || row.createdAt || row.date || row.occurredAt || '')
}

function relativeTime(value: unknown) {
  const raw = String(value || '')
  if (!raw) return '—'
  const date = new Date(raw.includes('T') || raw.includes(' ') ? raw : `${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return km.value ? 'មុននេះ' : 'just now'
  if (abs < 3600) {
    const mins = Math.max(1, Math.round(abs / 60))
    return km.value ? `${mins} នាទីមុន` : `${mins} minute${mins === 1 ? '' : 's'} ago`
  }
  if (abs < 86400) {
    const hours = Math.max(1, Math.round(abs / 3600))
    return km.value ? `${hours} ម៉ោងមុន` : `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.max(1, Math.round(abs / 86400))
  return km.value ? `${days} ថ្ងៃមុន` : `${days} day${days === 1 ? '' : 's'} ago`
}

function commentCount(row: Record<string, unknown>) {
  const comments = row.comments
  return Array.isArray(comments) ? comments.length : 0
}

const pageSummary = computed(() => {
  const total = result.value.total
  if (!total) return km.value ? '0 នៃ 0' : '0 of 0'
  const start = pagination.value.pageIndex * pagination.value.pageSize
  const end = Math.min(start + pagination.value.pageSize, total)
  const shown = Math.max(0, end - start)
  return km.value ? `${shown} នៃ ${total}` : `${shown} of ${total}`
})

function initials(row: Record<string, unknown>) {
  const name = String(row.assignedStaff || row.user || row.contact || row.updatedBy || 'SYS')
  const parts = name.split(/[\s.]+/).filter(Boolean)
  return (parts.slice(0, 2).map(part => part[0]).join('') || 'SY').toUpperCase()
}

function rowMenuItems(row: Record<string, unknown>): DropdownMenuItem[][] {
  const items: DropdownMenuItem[] = [
    {
      label: km.value ? 'បើក' : 'Open',
      icon: 'i-lucide-eye',
      onSelect: () => openRow(row),
    },
  ]
  if (canMutate.value) {
    items.push({
      label: km.value ? 'ចម្លង' : 'Duplicate',
      icon: 'i-lucide-copy',
      onSelect: () => duplicateRow(row),
    })
    items.push({
      label: km.value ? 'លុប' : 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error',
      onSelect: () => { void deleteIds([String(row.id)]) },
    })
  }
  return [items]
}

const columns = computed<TableColumn<Record<string, unknown>>[]>(() => {
  if (!current.value) return []
  const summary = pageSummary.value
  const titleKey = current.value.titleField
  const dataColumns = current.value.columns.map((column, index) => ({
    accessorKey: column.key,
    enableSorting: false,
    header: fieldLabel(column),
    cell: ({ row }: { row: { original: Record<string, unknown> } }) => {
      const text = cellText(row.original, column.key)
      const isTitle = column.key === titleKey || (index === 0 && !current.value!.columns.some(item => item.key === titleKey))
      if (isTitle) {
        return h(ULink, {
          to: recordPath(row.original.id),
          class: 'font-medium text-highlighted hover:text-primary hover:underline',
        }, () => text)
      }
      if (column.key === 'status' || column.key.toLowerCase().includes('status')) {
        return h(UBadge, { color: statusColor(String(row.original[column.key] || '')), variant: 'subtle', class: 'capitalize' }, () => text)
      }
      if (column.key === 'direction' || column.key === 'stage') {
        return h(UBadge, { color: 'info', variant: 'subtle' }, () => text)
      }
      return h('span', { class: 'text-sm text-default' }, text)
    },
  }))

  return [
    {
      id: 'select',
      meta: freightTableCheckboxMeta,
      header: ({ table }) => h('div', { class: 'flex items-center justify-center' }, [
        h(UCheckbox, {
          'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
          'aria-label': km.value ? 'ជ្រើសទាំងអស់' : 'Select all',
        }),
      ]),
      cell: ({ row }) => h('div', { class: 'flex items-center justify-center' }, [
        h(UCheckbox, {
          'modelValue': row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': km.value ? 'ជ្រើសជួរ' : 'Select row',
        }),
      ]),
      enableSorting: false,
      enableHiding: false,
    },
    ...dataColumns,
    {
      id: 'actions',
      header: () => h('div', { class: 'flex items-center justify-end gap-1.5 text-xs font-normal text-muted' }, [
        h('span', summary),
        h(UIcon, { name: 'i-lucide-heart', class: 'size-3.5' }),
      ]),
      enableSorting: false,
      enableHiding: false,
      meta: { class: { td: 'text-end whitespace-nowrap', th: 'w-52' } },
      cell: ({ row }) => h('div', { class: 'flex items-center justify-end gap-2' }, [
        h(UAvatar, {
          text: initials(row.original),
          size: '2xs',
          alt: initials(row.original),
        }),
        h('span', { class: 'min-w-[5.5rem] text-xs text-muted' }, relativeTime(rowStamp(row.original))),
        h('span', { class: 'inline-flex items-center gap-0.5 text-xs text-muted', title: km.value ? 'មតិ' : 'Comments' }, [
          h(UIcon, { name: 'i-lucide-message-square', class: 'size-3.5' }),
          String(commentCount(row.original)),
        ]),
        h(UButton, {
          icon: 'i-lucide-heart',
          color: row.original.favorite ? 'error' : 'neutral',
          variant: 'ghost',
          size: 'xs',
          square: true,
          class: row.original.favorite ? 'text-error' : 'text-muted',
          'aria-label': km.value ? 'ចូលចិត្ត' : 'Favorite',
          onClick: (event: Event) => {
            event.stopPropagation()
            if (!current.value || current.value.readOnly) return
            store.save(current.value.collection, {
              ...row.original,
              favorite: !row.original.favorite,
            } as any)
          },
        }),
        h(UDropdownMenu, {
          content: { align: 'end' },
          items: rowMenuItems(row.original),
          'aria-label': km.value ? 'សកម្មភាព' : 'Actions',
        }, () => h(UButton, {
          icon: 'i-lucide-ellipsis',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs',
          'aria-label': km.value ? 'សកម្មភាព' : 'Actions',
        })),
      ]),
    },
  ]
})

function openCreate() {
  if (!current.value) return
  navigateTo(`${current.value.path}/new`)
}

function openRow(row: Record<string, unknown>) {
  if (!current.value || !row.id) return
  navigateTo(recordPath(row.id))
}

function onRowSelect(event: Event, row: TableRow<Record<string, unknown>>) {
  const target = event.target as HTMLElement | null
  if (target?.closest('a, button, input, [role="checkbox"], [role="menuitem"], [data-slot="dropdown-menu"]')) return
  openRow(row.original)
}

function duplicateRow(row: Record<string, unknown>) {
  if (!current.value || !canMutate.value) return
  const titleKey = current.value.titleField
  const copy = store.duplicate(current.value.collection, String(row.id), {
    [titleKey]: `${row[titleKey] || 'Record'}-COPY`,
  })
  if (!copy) return
  store.addAudit('Duplicated', current.value.title, String(copy.id))
  toast.add({ title: km.value ? 'បានចម្លង' : 'Duplicated', color: 'success' })
  navigateTo(recordPath(copy.id))
}

async function deleteIds(ids: string[]) {
  if (!current.value || !canMutate.value || !ids.length) return
  const ok = await confirm({ kind: 'delete', count: ids.length })
  if (!ok) return
  store.remove(current.value.collection, ids)
  store.addAudit('Deleted', current.value.title, ids.join(', '))
  rowSelection.value = {}
  toast.add({ title: t('docetra.actions.deletedItems', { n: ids.length }), color: 'success' })
}

function refresh() {
  store.hydrate()
}

function setPageSize(value: unknown) {
  pagination.value = { pageIndex: 0, pageSize: parsePageLimit(value, 20) }
}

function setPage(page: number) {
  pagination.value = { ...pagination.value, pageIndex: Math.max(0, page - 1) }
}

function filterItems(filter: { options?: readonly string[] | string[], key: string }) {
  const fromOptions = [...(filter.options || [])]
  const fromData = current.value
    ? [...new Set(store.list(current.value.collection).map(row => String(row[filter.key] ?? '').trim()).filter(Boolean))]
    : []
  return [...new Set([...fromOptions, ...fromData])]
    .map(value => String(value).trim())
    .filter(Boolean)
    .map(value => ({ label: value, value }))
}
</script>

<template>
  <div v-if="current" class="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
    <LayoutAppHeaderPageActions
      :can-create="canCreate"
      :create-label="`${km ? 'បង្កើត' : 'New'} ${moduleSingular(current)}`"
      :refreshing="pending"
      @create="openCreate"
      @refresh="refresh"
    />

    <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-1.5 pt-1.5 pb-0">
      <div class="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-default bg-default shadow-xs">
        <div class="flex items-center gap-3 border-b border-default px-2 py-2">
          <CommonAppLiveSearch
            v-model="q"
            class="w-56 shrink-0 sm:w-64"
            :placeholder="km ? 'ស្វែងរក...' : 'Search...'"
          />

          <div class="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto">
            <USelect
              v-for="filter in current.filters || []"
              :key="filter.key"
              :model-value="filters[filter.key] || undefined"
              :items="filterItems(filter)"
              :placeholder="fieldLabel(filter)"
              size="sm"
              class="w-40 shrink-0"
              :ui="getFilterSelectUi(isFilterValueActive(filters[filter.key]))"
              @update:model-value="filters[filter.key] = String($event || '')"
            />

            <CommonAppDateRangeFilter
              v-if="dateField"
              v-model:start="dateFrom"
              v-model:end="dateTo"
              granularity="day"
              class="shrink-0"
              :label="km ? 'កាលបរិច្ឆេទ' : 'Date'"
            />

            <template v-if="selectedIds.length && canMutate">
              <UButton
                color="error"
                variant="soft"
                size="sm"
                icon="i-lucide-trash-2"
                class="shrink-0"
                :label="km ? `លុប (${selectedIds.length})` : `Delete (${selectedIds.length})`"
                @click="deleteIds(selectedIds)"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="shrink-0"
                :label="km ? 'សម្អាត' : 'Clear'"
                @click="rowSelection = {}"
              />
            </template>
          </div>
        </div>

        <div ref="tableScrollEl" class="min-h-0 flex-1 overflow-auto p-2">
          <UTable
            v-model:row-selection="rowSelection"
            v-model:pagination="pagination"
            :data="result.all"
            :columns="columns"
            :loading="pending"
            :get-row-id="(row: Record<string, unknown>) => String(row.id || '')"
            :pagination-options="paginationOptions"
            :virtualize="virtualize"
            sticky="header"
            class="freight-table min-w-max"
            :ui="freightTableUi"
            @select="onRowSelect"
          />
        </div>

        <div class="flex items-center justify-between gap-3 border-t border-default px-3 py-2">
          <USelect
            :model-value="String(pagination.pageSize)"
            :items="TABLE_PAGE_SIZES.map(value => ({ label: String(value), value: String(value) }))"
            size="xs"
            class="w-20"
            @update:model-value="setPageSize"
          />
          <div class="text-xs text-muted">
            <span v-if="selectedIds.length">{{ selectedIds.length }} {{ km ? 'បានជ្រើស' : 'selected' }} · </span>
            {{ result.total }} {{ km ? 'កំណត់ត្រា' : 'records' }}
          </div>
          <UPagination
            :page="pagination.pageIndex + 1"
            :items-per-page="pagination.pageSize"
            :total="result.total"
            @update:page="setPage"
          />
        </div>
      </div>
    </div>
  </div>
</template>
