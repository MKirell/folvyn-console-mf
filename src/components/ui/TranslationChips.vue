<template>
  <span class="inline-flex flex-wrap items-center gap-1" :title="summary">
    <span
      v-for="lang in langs"
      :key="lang"
      class="rounded-[5px] border px-1.5 py-[1px] font-mono text-[0.6rem] uppercase leading-[1.5] transition-colors motion-reduce:transition-none"
      :class="stateClass(lang)"
      >{{ lang }}</span
    >
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CollectionDef } from '@/registry/collections'
import type { AdminDocument } from '@/types/admin'
import { hasTranslation, isTranslationComplete } from '@/utils/entity'

const props = defineProps<{
  collection: CollectionDef
  document: AdminDocument
  langs: string[]
}>()

function stateClass(lang: string): string {
  if (isTranslationComplete(props.collection, props.document, lang)) {
    return 'border-sage/45 bg-sage/12 text-sage'
  }
  if (hasTranslation(props.document, lang)) return 'border-gold/45 bg-gold/12 text-gold'
  return 'border-line/12 text-muted'
}

const summary = computed(() => {
  const complete = props.langs.filter((lang) =>
    isTranslationComplete(props.collection, props.document, lang),
  )
  return `${complete.length} of ${props.langs.length} translations complete`
})
</script>
