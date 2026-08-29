<script setup lang="ts">
defineProps<{
  documentNumber: string
  printDate: string
  printUser: string
}>()
</script>

<template>
  <!-- Fixed position repeats on every printed page in Chromium; hidden in preview chrome. -->
  <div class="print-footer">
    <span>{{ $t('freight.print.fields.printDate') }}: {{ printDate }}</span>
    <span class="font-medium">{{ documentNumber }}</span>
    <span>{{ $t('freight.print.fields.printUser') }}: {{ printUser }}</span>
  </div>
</template>

<style scoped>
.print-footer {
  display: none;
}
@media print {
  .print-footer {
    display: flex;
    position: fixed;
    bottom: 4mm;
    left: 0;
    right: 0;
    justify-content: space-between;
    padding: 0 8mm;
    font-size: 9px;
    color: #374151;
  }
}
</style>
