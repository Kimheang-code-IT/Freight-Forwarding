<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { tableRowActorName, tableRowCommentCount, tableRowInitials, tableRowStamp } from '~/utils/table/row-meta'

const props = withDefaults(defineProps<{
  row: Record<string, unknown>
  items: DropdownMenuItem[][]
  loading?: boolean
}>(), {
  loading: false,
})

const { t } = useI18n()

const stamp = computed(() => tableRowStamp(props.row))
const letters = computed(() => tableRowInitials(props.row))
const actor = computed(() => tableRowActorName(props.row) || letters.value)
const comments = computed(() => tableRowCommentCount(props.row))

const relative = computed(() => {
  const raw = stamp.value
  if (!raw) return '—'
  const date = new Date(raw.includes('T') || raw.includes(' ') ? raw : `${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 45) return t('freight.ui.justNow')
  if (abs < 3600) {
    const mins = Math.max(1, Math.round(abs / 60))
    return t('freight.ui.minutesAgo', { n: mins })
  }
  if (abs < 86400) {
    const hours = Math.max(1, Math.round(abs / 3600))
    return t('freight.ui.hoursAgo', { n: hours })
  }
  const days = Math.max(1, Math.round(abs / 86400))
  return t('freight.ui.daysAgo', { n: days })
})
</script>

<template>
  <div class="flex items-center justify-end gap-2">
    <UAvatar
      :text="letters"
      size="2xs"
      :alt="actor"
    />
    <span class="min-w-22 text-xs text-muted" :title="stamp">{{ relative }}</span>
    <span
      class="inline-flex items-center gap-0.5 text-xs text-muted"
      :title="t('freight.ui.comments')"
    >
      <UIcon name="i-lucide-message-square" class="size-3.5" />
      {{ comments }}
    </span>
    <UDropdownMenu :items="items" :content="{ align: 'end' }" :aria-label="t('freight.ui.actions')">
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="xs"
        :loading="loading"
        :aria-label="t('freight.ui.actions')"
      />
    </UDropdownMenu>
  </div>
</template>
