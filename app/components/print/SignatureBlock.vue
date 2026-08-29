<script setup lang="ts">
export type PrintSignatureSlot = { caption: string, name?: string }

withDefaults(defineProps<{
  slots: PrintSignatureSlot[]
  /** Blank signature lines look professional; only render stored assets when configured later. */
  lines?: boolean
}>(), { lines: true })
</script>

<template>
  <div
    class="grid gap-6 text-center text-[11px] text-gray-900"
    :style="{ gridTemplateColumns: `repeat(${Math.min(slots.length || 1, 4)}, minmax(0, 1fr))` }"
  >
    <div v-for="slot in slots" :key="slot.caption" class="space-y-1">
      <p class="font-semibold">{{ slot.caption }}</p>
      <div class="mx-auto w-[42mm]" :class="lines ? 'border-b border-gray-800' : ''" aria-hidden="true" />
      <p v-if="slot.name" class="text-gray-700">{{ slot.name }}</p>
    </div>
  </div>
</template>
