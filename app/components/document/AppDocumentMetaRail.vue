<script setup lang="ts">
import type { TimelineItem } from '@nuxt/ui'
import type { ActivityEvent, PersonSummary } from '~/types/docetra/common'

const props = defineProps<{
  title?: string
  subtitle?: string
  owner?: PersonSummary
  activity?: ActivityEvent[]
  createdAt?: string
  updatedAt?: string
}>()

const { t } = useI18n()

const initial = computed(() => {
  const text = (props.title || '').trim()
  return text ? text.charAt(0).toUpperCase() : '—'
})

const auditItems = computed<TimelineItem[]>(() => {
  const events = [...(props.activity || [])]
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))

  if (events.length) {
    return events.map((event, index) => {
      const result = event.metadata?.result ? String(event.metadata.result) : ''
      const remark = event.metadata?.remark ? String(event.metadata.remark) : ''
      return {
        value: event.id || index,
        date: relativeTime(event.occurredAt) || event.occurredAt,
        title: event.summary || event.action,
        description: [event.actor?.name, result, remark].filter(Boolean).join(' · '),
        icon: 'i-lucide-history',
      }
    })
  }

  const fallback: TimelineItem[] = []
  if (props.updatedAt) {
    fallback.push({
      value: 'updated',
      date: relativeTime(props.updatedAt),
      title: `${t('docetra.meta.lastEditedBy')} ${t('docetra.meta.you')}`,
      icon: 'i-lucide-pencil',
    })
  }
  if (props.createdAt) {
    fallback.push({
      value: 'created',
      date: relativeTime(props.createdAt),
      title: `${t('docetra.meta.createdBy')} ${props.owner?.name || t('docetra.meta.you')}`,
      icon: 'i-lucide-plus',
    })
  }
  return fallback
})

function relativeTime(iso?: string) {
  if (!iso) return ''
  const parsed = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T')).getTime()
  if (Number.isNaN(parsed)) return iso
  const diff = Date.now() - parsed
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('docetra.meta.justNow')
  if (mins === 1) return t('docetra.meta.minuteAgo')
  if (mins < 60) return t('docetra.meta.minutesAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours === 1) return t('docetra.meta.hourAgo')
  if (hours < 24) return t('docetra.meta.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('docetra.meta.dayAgo')
  return t('docetra.meta.daysAgo', { n: days })
}
</script>

<template>
  <aside class="flex w-full shrink-0 flex-col border-default bg-default lg:w-64 xl:w-72 lg:border-s">
    <section class="flex items-start gap-3 border-b border-default p-4">
      <div class="grid size-14 shrink-0 place-items-center rounded-lg bg-elevated text-xl font-semibold text-toned">
        {{ initial }}
      </div>
      <div class="min-w-0 flex-1 pt-0.5">
        <p class="truncate text-sm font-semibold text-highlighted">{{ title || '—' }}</p>
        <p v-if="subtitle" class="mt-0.5 truncate text-xs text-muted">{{ subtitle }}</p>
      </div>
    </section>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div class="mb-3 flex items-center gap-2 text-sm text-toned">
        <UIcon name="i-lucide-history" class="size-4 shrink-0 text-muted" />
        <span class="min-w-0 flex-1 truncate">{{ $t('docetra.meta.auditTimeline') }}</span>
      </div>

      <p v-if="!auditItems.length" class="text-xs text-muted">
        {{ $t('docetra.meta.noActivity') }}
      </p>
      <UTimeline
        v-else
        color="neutral"
        size="xs"
        :items="auditItems"
        class="w-full"
      />
    </div>
  </aside>
</template>
