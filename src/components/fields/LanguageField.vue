<template>
  <select
    :id="id"
    :value="modelValue"
    class="w-full rounded-[9px] border border-line/10 bg-bg px-3 py-2 text-[0.84rem] outline-none focus:border-accent/50"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option value="" disabled>Choose a language…</option>
    <option v-for="language in languages" :key="language.code" :value="language.code">
      {{ language.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ISO_639_1 } from '@/registry/languages'

defineProps<{ id: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const languages = computed(() => {
  const names = new Intl.DisplayNames(['en'], { type: 'language' })

  return ISO_639_1.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )
})
</script>
