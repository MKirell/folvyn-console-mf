<template>
  <div>
    <select
      :id="id"
      :value="modelValue"
      class="w-full rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none focus:border-accent/50"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Choose a country…</option>
      <option v-for="country in countries" :key="country.code" :value="country.code">
        {{ country.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ISO_3166_1_ALPHA_2 } from '@/registry/countries'

defineProps<{ id: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const CODES = ISO_3166_1_ALPHA_2

const countries = computed(() => {
  const names = new Intl.DisplayNames(['en'], { type: 'region' })

  return CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
})
</script>
