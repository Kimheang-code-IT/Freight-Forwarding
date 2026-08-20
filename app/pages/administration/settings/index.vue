<script setup lang="ts">
definePageMeta({
  titleKey: 'freight.pages.settings',
  permission: 'settings.app_config.view',
})

await navigateTo('/settings/app-config', { replace: true })
</script>

<template>
  <div />
</template>
