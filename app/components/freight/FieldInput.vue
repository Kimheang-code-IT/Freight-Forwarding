<script setup lang="ts">
import type { FreightField } from '~/config/freight-modules'
import { useFreightLabel } from '~/composables/freight/useFreight'
import { documentSequenceTypeLabel } from '~/utils/document-sequences'

const props = defineProps<{
  field: FreightField
  modelValue: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [unknown]
}>()

const { t, te } = useI18n()
const { fieldLabel } = useFreightLabel()

const items = computed(() =>
  (props.field.options || [])
    .map(option => String(option).trim())
    .filter(Boolean)
    .map(option => ({ label: props.field.key === 'documentType' ? documentSequenceTypeLabel(option) : option, value: option })),
)

const help = computed(() => {
  if (props.field.help) return props.field.help
  if (props.field.helpKey && te(props.field.helpKey)) return t(props.field.helpKey)
  const fieldHelpKey = `freight.fieldHelp.${props.field.key}`
  if (te(fieldHelpKey)) return t(fieldHelpKey)
  if (props.field.computed) return t('freight.ui.calculatedHelp')
  return t('freight.ui.enterFieldHelp', { field: fieldLabel(props.field) })
})

const checkboxTrue = computed(() => String(props.field.options?.[0] ?? 'Yes'))
const checkboxFalse = computed(() => String(props.field.options?.[1] ?? 'No'))
</script>

<template>
  <UFormField
    v-if="field.type === 'checkbox'"
    :help="help"
    class="min-w-0"
  >
    <div class="flex min-h-11 items-center pt-1">
      <UCheckbox
        :model-value="modelValue"
        :true-value="checkboxTrue"
        :false-value="checkboxFalse"
        :disabled="disabled || field.computed"
        size="lg"
        @update:model-value="emit('update:modelValue', $event)"
      >
        <template #label>
          <span class="inline-flex items-center gap-2 text-base text-highlighted">
            <span>{{ fieldLabel(field) }}</span>
            <UTooltip :text="help">
              <UIcon name="i-lucide-info" class="size-4 text-muted" />
            </UTooltip>
          </span>
        </template>
      </UCheckbox>
    </div>
  </UFormField>
  <UFormField
    v-else
    :label="fieldLabel(field)"
    :required="Boolean(field.required)"
    :help="help"
    class="min-w-0"
  >
    <USelect
      v-if="field.type === 'select'"
      :model-value="modelValue ? String(modelValue) : undefined"
      :items="items"
      :disabled="disabled || field.computed"
      size="lg"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event ?? '')"
    />
    <USelect
      v-else-if="field.type === 'multiselect'"
      multiple
      :model-value="Array.isArray(modelValue) ? modelValue.map(String) : []"
      :items="items"
      :disabled="disabled"
      value-key="value"
      size="lg"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInputNumber
      v-else-if="field.type === 'number'"
      :model-value="Number(modelValue || 0)"
      :disabled="disabled || field.computed"
      size="lg"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event ?? 0)"
    />
    <UTextarea
      v-else-if="field.type === 'textarea'"
      :model-value="String(modelValue ?? '')"
      :disabled="disabled"
      :rows="4"
      size="lg"
      autoresize
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <CommonAppInputDate
      v-else-if="field.type === 'date' || field.type === 'datetime'"
      :model-value="String(modelValue ?? '')"
      :granularity="field.type === 'datetime' ? 'minute' : 'day'"
      :disabled="disabled || field.computed"
      :required="Boolean(field.required)"
      size="lg"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else-if="field.type === 'password'"
      type="password"
      :model-value="String(modelValue ?? '')"
      :disabled="disabled"
      size="lg"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else-if="field.type === 'file'"
      type="file"
      :disabled="disabled"
      size="lg"
      class="w-full"
      @change="(event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0]
        emit('update:modelValue', file?.name || modelValue)
      }"
    />
    <UInput
      v-else
      :model-value="String(modelValue ?? '')"
      :disabled="disabled || field.computed"
      size="lg"
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </UFormField>
</template>
