<template>
  <div class="flex items-center gap-2">
    <select
      :id="id"
      v-model="month"
      class="h-[38px] min-w-0 flex-1 rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none focus:border-accent/50"
      :aria-label="t('ui.month')"
      @change="commit"
    >
      <option value="" disabled>{{ t('ui.month') }}</option>
      <option v-for="entry in months" :key="entry.value" :value="entry.value">
        {{ entry.label }}
      </option>
    </select>

    <input
      :value="year"
      type="number"
      inputmode="numeric"
      min="1900"
      max="2999"
      :placeholder="t('ui.year')"
      :aria-label="t('ui.year')"
      class="h-[38px] w-[86px] shrink-0 rounded-[9px] border border-line/10 bg-bg px-3 py-2 font-mono text-[0.82rem] tabular-nums outline-none focus:border-accent/50"
      @input="onYear($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ id: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const { t, locale } = useI18n()

const year = ref(props.modelValue.split('-')[0] ?? '')
const month = ref(props.modelValue.split('-')[1] ?? '')

let published = props.modelValue

watch(
  () => props.modelValue,
  (value) => {
    if (value === published) return
    published = value
    year.value = value.split('-')[0] ?? ''
    month.value = value.split('-')[1] ?? ''
  },
)

const months = computed(() => {
  const format = new Intl.DateTimeFormat(locale.value, { month: 'long' })

  return Array.from({ length: 12 }, (_, index) => {
    const name = format.format(new Date(Date.UTC(2000, index, 1)))
    return {
      value: String(index + 1).padStart(2, '0'),
      label: `${name.charAt(0).toLocaleUpperCase(locale.value)}${name.slice(1)}`,
    }
  })
})

function onYear(event: Event): void {
  year.value = (event.target as HTMLInputElement).value
  commit()
}

function commit(): void {
  const trimmed = year.value.trim()
  const next = month.value && trimmed.length === 4 ? `${trimmed}-${month.value}` : ''
  if (next === published) return
  published = next
  emit('update:modelValue', next)
}
</script>
