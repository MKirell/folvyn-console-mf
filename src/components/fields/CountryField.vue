<template>
  <div>
    <select
      :id="id"
      :value="modelValue"
      class="w-full h-[38px] rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none focus:border-accent/50"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ t('ui.chooseCountry') }}</option>
      <option v-for="country in countries" :key="country.code" :value="country.code">
        {{ country.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ISO_3166_1_ALPHA_2 } from '@/registry/countries'
import { useI18n } from 'vue-i18n'

defineProps<{ id: string; modelValue: string }>()
const { t, locale } = useI18n()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const CODES = ISO_3166_1_ALPHA_2

const countries = computed(() => {
  const names = new Intl.DisplayNames([locale.value], { type: 'region' })

  return CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
})
</script>
