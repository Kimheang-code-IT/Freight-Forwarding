<script setup lang="ts">
import type { PrintSettlement } from '~/utils/freight/print-model'

defineProps<{ settlement: PrintSettlement, title: string }>()
</script>

<template>
  <div class="text-[11px] leading-relaxed text-gray-900">
    <p class="mb-1 font-semibold">{{ title }}</p>
    <div class="grid grid-cols-[26mm_1fr] gap-x-2">
      <template v-if="settlement.accountName">
        <span class="text-gray-600">{{ $t('freight.print.fields.accountName') }}</span>
        <span>{{ settlement.accountName }}</span>
      </template>
      <template v-if="settlement.bankName">
        <span class="text-gray-600">{{ $t('freight.print.fields.bankName') }}</span>
        <span>{{ settlement.bankName }}</span>
      </template>
      <template v-if="settlement.accountNumber">
        <span class="text-gray-600">{{ $t('freight.print.fields.accountNo') }}</span>
        <span>{{ settlement.accountNumber }}</span>
      </template>
      <template v-if="settlement.swiftCode">
        <span class="text-gray-600">{{ $t('freight.print.fields.swiftCode') }}</span>
        <span>{{ settlement.swiftCode }}</span>
      </template>
    </div>
  </div>
</template>
