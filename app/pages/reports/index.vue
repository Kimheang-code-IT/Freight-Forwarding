<script setup lang="ts">
definePageMeta({
  titleKey: 'freight.pages.generalLedger',
  permission: 'reports.view',
})
await navigateTo('/reports/operations/service-orders', { replace: true })
</script>

<template>
  <FreightReportsView />
</template>
