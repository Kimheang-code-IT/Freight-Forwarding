<script setup lang="ts">
import type { PrintIssuer } from '~/utils/freight/print-model'

defineProps<{ issuer: PrintIssuer, showKhmer?: boolean }>()

const logoFailed = ref(false)
</script>

<template>
  <div class="flex items-center gap-4">
    <div v-if="issuer.logoUrl && !logoFailed" class="w-[38mm] shrink-0">
      <!-- object-contain keeps the asset's intrinsic aspect ratio; white backing avoids visible padding boxes. -->
      <img
        :src="issuer.logoUrl"
        :alt="issuer.legalName || issuer.displayName || 'issuer logo'"
        class="h-auto max-h-[24mm] w-full object-contain object-left"
        @error="logoFailed = true"
      >
    </div>
    <div class="min-w-0 flex-1 text-center">
      <p v-if="showKhmer && issuer.legalNameKh" class="text-base font-bold leading-snug text-gray-900">
        {{ issuer.legalNameKh }}
      </p>
      <p class="text-lg font-bold uppercase leading-tight text-gray-900">
        {{ issuer.legalName || issuer.displayName }}
      </p>
      <p v-if="issuer.taxIdentifier" class="text-[11px] leading-snug text-gray-700">
        {{ $t('freight.print.fields.vatTin') }}: {{ issuer.taxIdentifier }}
      </p>
      <p v-if="issuer.addressKh && showKhmer" class="text-[11px] leading-snug text-gray-700">
        {{ issuer.addressKh }}
      </p>
      <p v-if="issuer.address" class="text-[11px] leading-snug text-gray-700">{{ issuer.address }}</p>
      <p v-if="issuer.phone || issuer.email" class="text-[11px] leading-snug text-gray-700">
        <span v-if="issuer.phone">{{ $t('freight.print.fields.telephone') }} {{ issuer.phone }}</span>
        <span v-if="issuer.phone && issuer.email"> / </span>
        <span v-if="issuer.email">{{ $t('freight.print.fields.email') }}: {{ issuer.email }}</span>
      </p>
    </div>
    <div class="w-[38mm] shrink-0" aria-hidden="true" />
  </div>
</template>
