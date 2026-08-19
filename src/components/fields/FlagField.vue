<template>
  <div class="flex items-center gap-2">
    <span
      class="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-line/10 bg-bg-tint"
    >
      <FlagBadge :code="modelValue" :show-code="false" />
    </span>

    <select
      :id="id"
      :value="modelValue"
      class="w-full h-[38px] rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none focus:border-accent/50"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ t('ui.chooseCountry') }}</option>
      <option v-for="flag in flags" :key="flag.code" :value="flag.code">
        {{ flag.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FlagBadge from '@/components/ui/FlagBadge.vue'
import { FLAG_CODES } from '@/utils/flags'
import { useI18n } from 'vue-i18n'

withDefaults(defineProps<{ modelValue: string; id?: string }>(), { id: undefined })
const { t, locale } = useI18n()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const flags = computed(() => {
  const names = new Intl.DisplayNames([locale.value], { type: 'region' })

  return FLAG_CODES.map((code) => ({ code, name: regionName(names, code) }))
    .filter((flag) => flag.name !== '')
    .sort((a, b) => a.name.localeCompare(b.name))
})

function regionName(names: Intl.DisplayNames, code: string): string {
  try {
    const name = names.of(code.toUpperCase())
    return name && name !== code.toUpperCase() ? name : ''
  } catch {
    return ''
  }
}
</script>
