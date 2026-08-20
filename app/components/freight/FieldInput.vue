<script setup lang="ts">
import type { FreightField } from '~/config/freight-modules'
import { useFreightLabel } from '~/composables/freight/useFreight'

const props = defineProps<{
  field: FreightField
  modelValue: unknown
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [unknown]
}>()

const { fieldLabel, km } = useFreightLabel()

const items = computed(() =>
  (props.field.options || [])
    .map(option => String(option).trim())
    .filter(Boolean)
    .map(option => ({ label: option, value: option })),
)

const help = computed(() => {
  if (props.field.computed) return km.value ? 'គណនាស្វ័យប្រវត្តិ។' : 'Calculated automatically.'
  const label = fieldLabel(props.field).toLowerCase()
  return km.value
    ? `បញ្ចូល${fieldLabel(props.field)}សម្រាប់កំណត់ត្រានេះ។`
    : `Enter the ${label} used on this record.`
})
</script>

<template>
  <UFormField
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
      autoresize
      class="w-full"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <UInput
      v-else-if="field.type === 'date' || field.type === 'datetime'"
      :type="field.type === 'datetime' ? 'datetime-local' : 'date'"
      :model-value="String(modelValue ?? '')"
      :disabled="disabled"
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
