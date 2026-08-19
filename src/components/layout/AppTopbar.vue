<template>
  <header
    class="sticky top-0 z-[90] flex h-topbar shrink-0 items-center gap-3 border-b border-line/8 bg-bg/85 px-pad backdrop-blur-[16px]"
  >
    <button
      type="button"
      class="hidden max-1000:grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-ink-soft transition-colors hover:bg-bg-tint hover:text-ink"
      :aria-label="t('nav.open')"
      @click="ui.mobileNavOpen = true"
    >
      <Menu :size="18" :stroke-width="2" />
    </button>

    <h1 class="min-w-0 shrink truncate font-disp text-[1.02rem] font-semibold tracking-tight">
      {{ title }}
    </h1>

    <span
      v-if="ui.dirty"
      class="flex shrink-0 items-center gap-1.5 rounded-full bg-gold/14 px-2.5 py-[3px] font-mono text-[0.62rem] uppercase tracking-[0.12em] text-gold"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-gold animate-breathe"></span>
      unsaved
    </span>

    <div class="ms-auto flex shrink-0 items-center gap-1.5">
      <div
        v-if="locales.length > 1"
        class="flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-surface p-[3px]"
        role="group"
        :aria-label="t('topbar.editingLocale')"
      >
        <button
          v-for="locale in locales"
          :key="locale.code"
          type="button"
          class="rounded-[6px] px-2 py-[3px] font-mono text-[0.68rem] uppercase transition-colors motion-reduce:transition-none"
          :class="
            locale.code === editingLang
              ? 'bg-accent/14 text-accent-deep'
              : 'text-muted hover:text-ink'
          "
          :aria-pressed="locale.code === editingLang"
          :aria-label="t('topbar.editLocale', { code: locale.code })"
          @click="ui.setEditingLang(locale.code)"
        >
          {{ locale.code }}
        </button>
      </div>

      <button
        type="button"
        class="ms-2.5 flex items-center gap-2 rounded-[9px] border border-line/8 bg-surface px-2.5 py-[6px] text-[0.74rem] text-muted transition-colors hover:border-accent/35 hover:text-ink max-900:hidden"
        :aria-label="t('topbar.commandPalette')"
        @click="ui.paletteOpen = true"
      >
        <Search :size="14" :stroke-width="1.9" aria-hidden="true" />
        <span>{{ t('common.search') }}</span>
        <kbd class="font-mono text-[0.62rem] text-muted">{{ metaKey }} K</kbd>
      </button>

      <button
        type="button"
        class="hidden max-900:grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
        :aria-label="t('topbar.commandPalette')"
        @click="ui.paletteOpen = true"
      >
        <Search :size="16" :stroke-width="1.9" />
      </button>

      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-bg-tint hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
        :disabled="!history.canUndo"
        :title="
          history.canUndo
            ? t('topbar.undoLabel', { label: history.nextLabel })
            : t('topbar.nothingToUndo')
        "
        :aria-label="t('topbar.undo')"
        @click="undo"
      >
        <Undo2 :size="16" :stroke-width="1.9" />
      </button>

      <RouterLink
        v-if="!auth.isPlatform && owner.record"
        :to="{ name: 'portfolio' }"
        class="flex items-center gap-1.5 rounded-full px-2 py-[4px] font-mono text-[0.62rem] uppercase tracking-[0.12em] transition-colors max-700:hidden"
        :class="
          owner.published
            ? 'bg-sage/14 text-sage hover:bg-sage/22'
            : 'bg-gold/14 text-gold hover:bg-gold/22'
        "
        :title="owner.published ? t('topbar.live') : t('topbar.draft')"
      >
        {{ statusLabel(owner.status) }}
      </RouterLink>

      <a
        v-if="!auth.isPlatform"
        :href="owner.publicUrl"
        target="_blank"
        rel="noreferrer"
        class="grid h-8 w-8 place-items-center rounded-[8px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
        :title="t('topbar.openUrl', { url: owner.publicUrl })"
        :aria-label="t('topbar.openPortfolio')"
      >
        <ExternalLink :size="16" :stroke-width="1.9" />
      </a>

      <span
        class="flex items-center gap-1.5 rounded-full border border-line/8 px-2 py-[4px]"
        :title="healthTitle"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="healthDot"></span>
        <span class="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">api</span>
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ExternalLink, Menu, Search, Undo2 } from '@lucide/vue'
import { COLLECTIONS } from '@/registry/collections'
import { useAuthStore } from '@/stores/auth'
import { useOwnerStore } from '@/stores/owner'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { useHealth } from '@/composables/useHealth'
import { useI18n } from 'vue-i18n'
import { collectionLabel, screenLabel, statusLabel } from '@/i18n/labels'

const { t } = useI18n()
const route = useRoute()
const auth = useAuthStore()
const owner = useOwnerStore()
const content = useContentStore()
const history = useHistoryStore()
const ui = useUiStore()
const { state } = useHealth()

const locales = computed(() => content.locales)
const editingLang = computed(() => ui.editingLang || content.referenceLang)

const metaKey = computed(() =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl',
)

const title = computed(() => {
  const key = route.params.collection
  if (typeof key === 'string' && COLLECTIONS[key]) return collectionLabel(COLLECTIONS[key])

  const singleton = route.meta.collection
  if (typeof singleton === 'string' && COLLECTIONS[singleton]) {
    return collectionLabel(COLLECTIONS[singleton])
  }

  const fallback = (route.meta.title as string | undefined) ?? t('app.name')
  const titleKey = route.meta.titleKey as string | undefined
  return titleKey ? screenLabel(titleKey, fallback) : fallback
})

const healthDot = computed(() => {
  if (state.value === 'up') return 'bg-sage'
  if (state.value === 'down') return 'bg-rust animate-breathe'
  return 'bg-muted'
})

const healthTitle = computed(() => {
  if (state.value === 'up') return t('topbar.apiUp')
  if (state.value === 'down') return t('topbar.apiDown')
  return t('topbar.apiChecking')
})

async function undo(): Promise<void> {
  try {
    const label = await history.undo()
    if (label) ui.notify('good', t('topbar.undone'), label)
  } catch (error) {
    ui.notify('bad', t('topbar.undoFailed'), error instanceof Error ? error.message : undefined)
  }
}
</script>
