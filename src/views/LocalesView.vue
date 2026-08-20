<template>
  <div class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">
          {{ t('views.locales.title') }}
        </h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{ t('blurbs.locales') }}
        </p>
      </div>
      <AppButton variant="primary" @click="router.push('/c/locale/new')">
        <Plus :size="14" :stroke-width="2.2" aria-hidden="true" />
        {{ t('views.locales.add') }}
      </AppButton>
    </header>

    <EmptyState
      v-if="content.failed"
      icon="Shield"
      :title="t('errors.locales')"
      :description="content.error ?? t('common.unreachableDesc')"
    >
      <AppButton variant="primary" :busy="content.loading" @click="content.loadAll(true)">{{
        t('common.retry')
      }}</AppButton>
    </EmptyState>

    <SkeletonList v-else-if="!content.loaded" :rows="3" :label="t('loading.locales')" />

    <EmptyState
      v-else-if="locales.length === 0"
      icon="Globe"
      :title="t('views.locales.emptyTitle')"
      :description="t('views.locales.emptyDesc')"
    >
      <AppButton variant="primary" @click="router.push('/c/locale/new')">{{
        t('views.locales.addFirst')
      }}</AppButton>
    </EmptyState>

    <ul v-else class="space-y-1.5" role="list">
      <li
        v-for="(locale, index) in locales"
        :key="locale.id"
        draggable="true"
        class="group flex items-center gap-3 rounded-[11px] border bg-surface px-3.5 py-3 transition-[border-color,opacity] motion-reduce:transition-none max-700:gap-2 max-700:px-3"
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
            (locale.code ?? '').toUpperCase()
          }}</span>
        </RouterLink>

        <div class="ms-auto flex shrink-0 items-center gap-4 max-700:gap-2">
          <span
            v-if="share(locale.code) !== null"
            class="shrink-0 rounded-[6px] bg-bg-tint px-2 py-[3px] font-mono text-[0.66rem] tabular-nums text-muted"
            :title="t('views.locales.shareTitle')"
            >{{ t('views.locales.traffic', { pct: share(locale.code) }) }}</span
          >

          <button
            type="button"
            role="switch"
            :aria-checked="locale.enabled"
            :aria-label="t('views.locales.toggleAria', { code: (locale.code ?? '').toUpperCase() })"
            :disabled="busy === locale.id"
            class="flex shrink-0 items-center gap-1.5 rounded-[7px] px-2 py-[3px] font-mono text-[0.62rem] uppercase transition-colors disabled:opacity-50"
            :class="
              locale.enabled
                ? 'bg-sage/14 text-sage hover:bg-sage/20'
                : 'bg-rust/14 text-rust hover:bg-rust/20'
            "
            @click="toggleEnabled(locale)"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="locale.enabled ? 'bg-sage' : 'bg-rust'"
            ></span>
            {{ locale.enabled ? t('common.on') : t('common.off') }}
          </button>

          <span class="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition-colors hover:bg-bg-tint hover:text-rust"
              :aria-label="t('views.locales.deleteAria', { code: locale.code })"
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
      :title="t('views.locales.deleteTitle')"
      :subject="(pending?.code ?? '').toUpperCase()"
      :message="t('views.locales.deleteMessage')"
      confirm-word="delete"
      @cancel="pending = null"
      @confirm="removeLocale"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { GripVertical, Plus, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import FlagBadge from '@/components/ui/FlagBadge.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useContentStore } from '@/stores/content'
import { useMediaStore } from '@/stores/media'
import { COLLECTIONS } from '@/registry/collections'
import { useUiStore } from '@/stores/ui'
import type { AdminLocale } from '@/types/admin'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
const content = useContentStore()
const media = useMediaStore()
const analytics = useAnalyticsStore()
const ui = useUiStore()

const locales = computed(() => content.locales)
const pending = ref<AdminLocale | null>(null)
const busy = ref('')

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
    ui.notify(
      'bad',
      t('views.locales.reorderFailed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
}

async function toggleEnabled(locale: AdminLocale): Promise<void> {
  busy.value = locale.id

  try {
    await content.update(COLLECTIONS.locale, locale.id, { enabled: !locale.enabled })
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.locales.toggleFailed'),
      cause instanceof Error ? cause.message : undefined,
    )
  } finally {
    busy.value = ''
  }
}

async function removeLocale(): Promise<void> {
  const locale = pending.value
  pending.value = null
  if (!locale) return

  try {
    await content.remove(COLLECTIONS.locale, locale.id)
    ui.notify('good', t('views.locales.deleted', { label: (locale.code ?? '').toUpperCase() }))
  } catch (cause) {
    ui.notify(
      'bad',
      t('views.locales.deleteFailed'),
      cause instanceof Error ? cause.message : undefined,
    )
  }
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
