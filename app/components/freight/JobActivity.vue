<script setup lang="ts">
import type { TimelineItem } from '@nuxt/ui'
import type { ActivityEvent } from '~/types/docetra/common'
const props = defineProps<{
  events: ActivityEvent[]
}>()

const { t } = useI18n()

const items = computed<TimelineItem[]>(() =>
  props.events.map((event, index) => ({
    value: index,
    date: event.occurredAt,
    title: event.summary || event.action,
    description: [event.actor?.name, event.entityType].filter(Boolean).join(' · '),
    icon: 'i-lucide-activity',
  })),
)
</script>

<template>
  <div class="space-y-4">
    <FreightJobSectionHeader :title="t('freight.ui.activity')" />
    <FreightJobEmptyState
      v-if="!events.length"
      :title="t('freight.ui.noActivity')"
      icon="i-lucide-activity"
    />
    <UTimeline
      v-else
      color="neutral"
      size="sm"
      reverse
      :items="items"
      class="max-w-xl"
    />
  </div>
</template>
