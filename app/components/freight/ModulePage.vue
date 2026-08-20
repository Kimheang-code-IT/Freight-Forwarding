<script setup lang="ts">
import { useFreightRouteModule } from '~/composables/freight/useFreight'

const { module } = useFreightRouteModule()
</script>

<template>
  <FreightReportsView v-if="module?.kind === 'reports'" />
  <FreightJobDetail v-else-if="module?.kind === 'job'" />
  <FreightDocumentView v-else />
</template>
