<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">Locales</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          Every locale here costs one translation per entry — drag a row to reorder.
        </p>
      </div>
      <AppButton variant="primary" @click="router.push('/c/locale/new')">
        <Plus :size="14" :stroke-width="2.2" aria-hidden="true" />
        Add locale
      </AppButton>
    </header>

    <EmptyState
      v-if="locales.length === 0"
      icon="Globe"
      title="No locales yet"
      description="The portfolio needs at least one to render."
    >
      <AppButton variant="primary" @click="router.push('/c/locale/new')">Add the first</AppButton>
    </EmptyState>

    <ul v-else class="space-y-1.5" role="list">
      <li
        v-for="(locale, index) in locales"
        :key="locale.id"
        draggable="true"
        class="group flex flex-wrap items-center gap-3 rounded-[11px] border bg-surface px-3.5 py-3 transition-[border-color,opacity] motion-reduce:transition-none"
        :class="[
          dragIndex === index ? 'opacity-45' : '',
          overIndex === index && dragIndex !== index
            ? 'border-accent/60'
            : 'border-line/8 hover:border-accent/30',
        ]"
        @dragstart="dragIndex = index"
        @dragover.prevent="overIndex = index"
        @dragend="onDrop"
        @drop.prevent="onDrop"
      >
        <span
          class="shrink-0 cursor-grab text-muted opacity-0 transition-opacity group-hover:opacity-100 max-700:hidden"
          aria-hidden="true"
        >
          <GripVertical :size="15" :stroke-width="1.8" />
        </span>

        <FlagBadge :code="locale.flagCode" :show-code="false" />

        <RouterLink :to="`/c/locale/${locale.id}`" class="min-w-0">
          <span class="block truncate font-mono text-[0.82rem] font-medium uppercase">{{
            locale.label || locale.code
          }}</span>
        </RouterLink>

        <div
          class="ms-auto flex items-center gap-4 max-700:ms-0 max-700:w-full max-700:flex-wrap max-700:gap-y-2.5"
        >
          <div class="w-[132px] max-700:w-full">
            <div class="mb-1 flex items-baseline justify-between">
              <span class="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted"
                >translated</span
              >
              <span class="font-mono text-[0.66rem] tabular-nums" :class="toneFor(locale.code)"
                >{{ percent(locale.code) }}%</span
              >
            </div>
            <span class="block h-1.5 overflow-hidden rounded-full bg-bg-tint">
              <span
                class="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                :class="barFor(locale.code)"
                :style="{ width: `${percent(locale.code)}%` }"
              ></span>
            </span>
          </div>

          <span
            v-if="share(locale.code) !== null"
            class="font-mono text-[0.68rem] tabular-nums text-muted"
            title="Share of sessions in the selected analytics period"
            >{{ share(locale.code) }}% traffic</span
          >

          <span
            class="rounded-[6px] px-2 py-[2px] font-mono text-[0.62rem] uppercase"
            :class="locale.enabled ? 'bg-sage/14 text-sage' : 'bg-surface-2/60 text-muted'"
            >{{ locale.enabled ? 'enabled' : 'disabled' }}</span
          >

          <AppButton size="sm" @click="router.push(`/locales/queue/${locale.code}`)">
            Work queue
            <ChevronRight :size="13" :stroke-width="2" aria-hidden="true" />
          </AppButton>

          <span class="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition-colors hover:bg-bg-tint hover:text-rust"
              :aria-label="`Delete ${locale.code}`"
              @click="pending = locale"
            >
              <Trash2 :size="14" :stroke-width="1.9" />
            </button>
          </span>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="pending !== null"
      title="Delete this locale?"
      :subject="pending?.label ?? ''"
      message="and every translation written in it disappear from your portfolio."
      confirm-word="delete"
      @cancel="pending = null"
      @confirm="removeLocale"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ChevronRight, GripVertical, Plus, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import FlagBadge from '@/components/ui/FlagBadge.vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useContentStore } from '@/stores/content'
import { useMediaStore } from '@/stores/media'
import { localeProgress } from '@/utils/locale-queue'
import { COLLECTIONS } from '@/registry/collections'
import { useUiStore } from '@/stores/ui'
import type { AdminLocale } from '@/types/admin'

const router = useRouter()
const content = useContentStore()
const media = useMediaStore()
const analytics = useAnalyticsStore()
const ui = useUiStore()

const locales = computed(() => content.locales)
const pending = ref<AdminLocale | null>(null)

const dragIndex = ref(-1)
const overIndex = ref(-1)

async function onDrop(): Promise<void> {
  const from = dragIndex.value
  const to = overIndex.value
  dragIndex.value = -1
  overIndex.value = -1

  if (from < 0 || to < 0 || from === to) return

  const ids = locales.value.map((locale) => locale.id)
  const [moved] = ids.splice(from, 1)
  ids.splice(to, 0, moved)

  try {
    await content.reorder(COLLECTIONS.locale, ids)
  } catch (cause) {
    ui.notify('bad', 'Reorder failed', cause instanceof Error ? cause.message : undefined)
  }
}

async function removeLocale(): Promise<void> {
  const locale = pending.value
  pending.value = null
  if (!locale) return

  try {
    await content.remove(COLLECTIONS.locale, locale.id)
    ui.notify('good', `${locale.label} deleted`)
  } catch (cause) {
    ui.notify('bad', 'Delete failed', cause instanceof Error ? cause.message : undefined)
  }
}

function percent(code: string): number {
  return localeProgress(content, code).percent
}

function toneFor(code: string): string {
  const value = percent(code)
  if (value >= 100) return 'text-sage'
  return value >= 50 ? 'text-gold' : 'text-rust'
}

function barFor(code: string): string {
  const value = percent(code)
  if (value >= 100) return 'bg-sage'
  return value >= 50 ? 'bg-gold' : 'bg-rust'
}

function share(code: string): number | null {
  const langs = analytics.summary?.langs
  if (!langs?.length) return null

  const total = langs.reduce((sum, entry) => sum + entry.count, 0)
  if (total === 0) return null

  const found = langs.find((entry) => entry.key === code)
  return Math.round(((found?.count ?? 0) / total) * 100)
}

onMounted(() => {
  void media.load()
  void analytics.load()
})
</script>
