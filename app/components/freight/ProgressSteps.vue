<script setup lang="ts">
import { JOB_STATUS } from '~/config/freight-options'

const props = defineProps<{
  current: string
  steps?: readonly string[] | string[]
}>()

const { t } = useI18n()
const steps = computed(() => props.steps?.length ? [...props.steps] : [...JOB_STATUS])
const currentIndex = computed(() => {
  const index = steps.value.findIndex(step => step === props.current)
  return index >= 0 ? index : 0
})
</script>

<template>
  <ol class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" :aria-label="t('freight.ui.jobProgress')">
    <li
      v-for="(step, index) in steps"
      :key="step"
      class="flex items-start gap-2 rounded-md border px-3 py-2"
      :class="index < currentIndex
        ? 'border-success/30 bg-success/5'
        : index === currentIndex
          ? 'border-primary/40 bg-primary/5'
          : 'border-default bg-default'"
      :aria-current="index === currentIndex ? 'step' : undefined"
    >
      <span
        class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
        :class="index < currentIndex
          ? 'bg-success text-white'
          : index === currentIndex
            ? 'bg-primary text-white'
            : 'bg-elevated text-muted'"
        :aria-hidden="true"
      >
        {{ index < currentIndex ? '✓' : index + 1 }}
      </span>
      <span class="text-xs font-medium" :class="index <= currentIndex ? 'text-highlighted' : 'text-muted'">
        {{ step }}
        <span class="sr-only">
          {{ index < currentIndex ? t('freight.ui.stepCompleted') : index === currentIndex ? t('freight.ui.stepCurrent') : t('freight.ui.stepPending') }}
        </span>
      </span>
    </li>
  </ol>
</template>
