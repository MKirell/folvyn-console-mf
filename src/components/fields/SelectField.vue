<template>
  <div>
    <select
      :id="id"
      :value="modelValue"
      class="h-[38px] w-full rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none focus:border-accent/50"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ placeholder || t('ui.chooseOne') }}</option>
      <option v-for="option in options" :key="option" :value="option">
        {{ label(option) }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    id: string
    modelValue: string
    options: string[]
    optionsKey?: string
    placeholder?: string
  }>(),
  { optionsKey: '', placeholder: '' },
)

const { t, te } = useI18n()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

function label(option: string): string {
  const key = `vocabularies.${props.optionsKey}.${option}`
  return props.optionsKey && te(key) ? t(key) : option
}
</script>
