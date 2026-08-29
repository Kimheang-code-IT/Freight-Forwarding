<script setup lang="ts">
defineProps<{
  items: Array<{ label: string, value: string, strong?: boolean }>
  currency?: string
}>()
</script>

<template>
  <div class="ml-auto w-[70mm] space-y-1 text-[11px] text-gray-900">
    <div
      v-for="item in items"
      :key="item.label"
      class="grid grid-cols-[1fr_26mm] items-baseline gap-x-2"
      :class="item.strong ? 'border-t-2 border-gray-800 pt-1 font-semibold' : ''"
    >
      <span class="text-gray-700">{{ item.label }}</span>
      <span class="text-right tabular-nums">{{ item.value }}</span>
    </div>
  </div>
</template>
