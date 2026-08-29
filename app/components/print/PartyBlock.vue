<script setup lang="ts">
import type { PrintParty } from '~/utils/freight/print-model'

defineProps<{
  labelKey: string
  party: PrintParty
  showPhone?: boolean
}>()
</script>

<template>
  <div class="space-y-1 text-[11px] leading-snug text-gray-900">
    <p class="font-semibold">{{ $t(labelKey) }}</p>
    <div class="grid grid-cols-[16mm_1fr] gap-x-2">
      <span class="text-gray-600">{{ $t('freight.print.fields.name') }}</span>
      <span class="font-medium">{{ party.name || party.legalName || '-' }}</span>
      <template v-if="party.address">
        <span class="text-gray-600">{{ $t('freight.print.fields.address') }}</span>
        <span>{{ party.address }}</span>
      </template>
      <template v-if="showPhone && party.phone">
        <span class="text-gray-600">{{ $t('freight.print.fields.telephone') }}</span>
        <span>{{ party.phone }}</span>
      </template>
      <template v-if="party.taxIdentifier">
        <span class="text-gray-600">{{ $t('freight.print.fields.vatTin') }}</span>
        <span>{{ party.taxIdentifier }}</span>
      </template>
    </div>
  </div>
</template>
