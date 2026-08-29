<script setup lang="ts">
export type PrintMetaItem = { label: string, value: string, strong?: boolean }

withDefaults(defineProps<{
  items: PrintMetaItem[]
  columns?: 1 | 2
}>(), { columns: 1 })
</script>

<template>
  <dl
    class="grid gap-x-6 gap-y-1 text-[11px] leading-snug text-gray-900"
    :class="columns === 2 ? 'sm:grid-cols-2' : ''"
  >
    <div v-for="item in items" :key="item.label" class="grid grid-cols-[26mm_1fr] items-baseline gap-x-2">
      <dt class="text-gray-600">{{ item.label }}</dt>
      <dd :class="item.strong ? 'font-semibold' : ''">{{ item.value || '-' }}</dd>
    </div>
  </dl>
</template>
