<template>
  <div class="space-y-2 max-600:space-y-4">
    <div
      v-for="lang in langs"
      :key="lang"
      class="flex items-center gap-2 max-600:flex-col max-600:items-start max-600:gap-1.5"
    >
      <span
        class="w-[52px] shrink-0 rounded-[6px] border border-line/10 bg-bg-tint px-2 py-1 text-center font-mono text-[0.68rem] uppercase text-ink-soft"
        >{{ lang }}</span
      >
      <AssetField
        class="min-w-0 flex-1 max-600:w-full"
        :model-value="modelValue[lang] ?? ''"
        :accept="accept"
        @update:model-value="set(lang, $event)"
      />
    </div>

    <p v-if="!langs.length" class="text-[0.78rem] text-muted">
      Add a locale first — this map is keyed by language code.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AssetField from '@/components/fields/AssetField.vue'
import { useContentStore } from '@/stores/content'
import type { AssetKind } from '@/registry/collections'

const props = withDefaults(
  defineProps<{ modelValue: Record<string, string>; accept?: AssetKind }>(),
  { accept: undefined },
)

const emit = defineEmits<{ 'update:modelValue': [Record<string, string>] }>()

const content = useContentStore()

const langs = computed(() => {
  const declared = content.langs
  const extra = Object.keys(props.modelValue).filter((lang) => !declared.includes(lang))
  return [...declared, ...extra]
})

function set(lang: string, value: string): void {
  const next = { ...props.modelValue }
  if (value.trim()) next[lang] = value.trim()
  else delete next[lang]
  emit('update:modelValue', next)
}
</script>
