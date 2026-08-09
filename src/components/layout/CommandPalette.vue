<template>
  <div
    v-if="ui.paletteOpen"
    class="fixed inset-0 z-[120] grid place-items-start justify-center bg-scrim/40 px-4 pt-[14vh] backdrop-blur-[6px]"
    role="dialog"
    aria-modal="true"
    aria-label="Command palette"
    @click.self="close"
  >
    <div
      class="w-full max-w-[560px] overflow-hidden rounded-lg border border-line/10 bg-surface shadow-[0_24px_70px_rgba(0,0,0,0.32)] animate-fade-up"
    >
      <div class="flex items-center gap-2.5 border-b border-line/8 px-4">
        <Search :size="16" :stroke-width="1.9" class="shrink-0 text-muted" aria-hidden="true" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          class="w-full bg-transparent py-3.5 text-[0.9rem] outline-none placeholder:text-muted"
          placeholder="Jump to a screen or an entry…"
          aria-label="Search"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
          @keydown.enter.prevent="choose(results[cursor])"
          @keydown.esc="close"
        />
        <kbd class="shrink-0 font-mono text-[0.62rem] text-muted">esc</kbd>
      </div>

      <ul v-if="results.length" class="scroll-thin max-h-[46vh] overflow-y-auto py-1.5" role="list">
        <li v-for="(result, index) in results" :key="result.to + result.label">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-4 py-2 text-start transition-colors motion-reduce:transition-none"
            :class="index === cursor ? 'bg-accent/10' : 'hover:bg-bg-tint'"
            @click="choose(result)"
            @mouseenter="cursor = index"
          >
            <component
              :is="iconComponent(result.icon)"
              v-if="iconComponent(result.icon)"
              :size="15"
              :stroke-width="1.9"
              class="shrink-0 text-muted"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate text-[0.84rem]">{{ result.label }}</span>
            <span
              class="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted"
              >{{ result.scope }}</span
            >
          </button>
        </li>
      </ul>

      <p v-else class="px-4 py-6 text-center text-[0.82rem] text-muted">
        Nothing matches “{{ query }}”.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@lucide/vue'
import { LIST_COLLECTIONS } from '@/registry/collections'
import { iconComponent } from '@/registry/icons'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import { titleOf } from '@/utils/entity'

interface PaletteResult {
  label: string
  scope: string
  icon: string
  to: string
}

const MAX_RESULTS = 40

const router = useRouter()
const content = useContentStore()
const ui = useUiStore()

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const query = ref('')
const cursor = ref(0)

const screens = computed<PaletteResult[]>(() => [
  { label: 'Insights', scope: 'screen', icon: 'Gauge', to: '/insights' },
  { label: 'Portfolio', scope: 'screen', icon: 'Rocket', to: '/portfolio' },
  { label: 'Person', scope: 'screen', icon: 'User', to: '/person' },
  { label: 'Hero', scope: 'screen', icon: 'Sparkles', to: '/profile' },
  { label: 'Locales', scope: 'screen', icon: 'Globe', to: '/locales' },
  { label: 'Media', scope: 'screen', icon: 'Image', to: '/media' },
  { label: 'History', scope: 'screen', icon: 'History', to: '/history' },
  ...LIST_COLLECTIONS.filter((collection) => collection.key !== 'locale').map((collection) => ({
    label: collection.label,
    scope: 'screen',
    icon: collection.icon,
    to: `/c/${collection.key}`,
  })),
])

const entries = computed<PaletteResult[]>(() => {
  const lang = ui.editingLang || content.referenceLang
  const results: PaletteResult[] = []

  for (const collection of LIST_COLLECTIONS) {
    for (const doc of content.list(collection.key)) {
      results.push({
        label: titleOf(collection, doc, lang),
        scope: collection.singular,
        icon: collection.icon,
        to: `/c/${collection.key}/${doc.id}`,
      })
    }
  }

  return results
})

const results = computed(() => {
  const needle = query.value.trim().toLowerCase()
  const pool = [...screens.value, ...entries.value]
  if (!needle) return pool.slice(0, MAX_RESULTS)

  return pool.filter((result) => result.label.toLowerCase().includes(needle)).slice(0, MAX_RESULTS)
})

function move(step: number): void {
  if (results.value.length === 0) return
  cursor.value = (cursor.value + step + results.value.length) % results.value.length
}

function close(): void {
  ui.paletteOpen = false
}

function choose(result: PaletteResult | undefined): void {
  if (!result) return
  close()
  void router.push(result.to)
}

watch(
  () => ui.paletteOpen,
  async (open) => {
    if (!open) return
    query.value = ''
    cursor.value = 0
    await nextTick()
    inputRef.value?.focus()
  },
)

watch(results, () => {
  cursor.value = 0
})
</script>
