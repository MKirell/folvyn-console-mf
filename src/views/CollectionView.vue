<template>
  <div v-if="!collection">
    <EmptyState
      :title="t('views.collection.unknownTitle')"
      :description="t('views.collection.unknownDesc')"
    />
  </div>

  <div v-else class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">{{ label }}</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">
          {{ t('views.collection.shown', { shown: rows.length, total: all.length }) }}
        </p>
      </div>

      <div
        class="flex min-w-0 items-center gap-1.5 rounded-[9px] border border-line/8 bg-surface px-2.5 max-480:basis-full"
      >
        <Search :size="14" :stroke-width="1.9" class="shrink-0 text-muted" aria-hidden="true" />
        <input
          v-model="query"
          type="text"
          class="w-[160px] min-w-0 shrink bg-transparent py-[7px] text-[0.8rem] outline-none placeholder:text-muted max-480:w-full"
          :placeholder="t('common.filter')"
          :aria-label="t('views.collection.filterAria', { label })"
        />
      </div>

      <select
        v-if="collection.i18n && langs.length"
        v-model="missingLang"
        class="rounded-[9px] border border-line/8 bg-surface px-2.5 py-[7px] text-[0.8rem] outline-none"
        :aria-label="t('views.collection.missingAria')"
      >
        <option value="">{{ t('views.collection.allTranslations') }}</option>
        <option v-for="code in langs" :key="code" :value="code">
          {{ t('views.collection.missing', { code }) }}
        </option>
      </select>

      <AppButton variant="primary" @click="router.push(`/c/${collection.key}/new`)">
        <Plus :size="14" :stroke-width="2.2" aria-hidden="true" />
        {{ t('common.new') }}
      </AppButton>
    </header>

    <EmptyState
      v-if="content.failed"
      icon="Shield"
      :title="t('errors.collection', { label })"
      :description="content.error ?? t('common.unreachableDesc')"
    >
      <AppButton variant="primary" :busy="content.loading" @click="content.loadAll(true)">{{
        t('common.retry')
      }}</AppButton>
    </EmptyState>

    <SkeletonList v-else-if="!content.loaded" :label="t('loading.collection', { label })" />

    <EmptyState
      v-else-if="all.length === 0"
      :icon="collection.icon"
      :title="t('views.collection.emptyTitle', { label: label.toLowerCase() })"
      :description="t('views.collection.emptyDesc')"
    >
      <AppButton variant="primary" @click="router.push(`/c/${collection.key}/new`)">
        {{ t('views.collection.createFirst') }}
      </AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="rows.length === 0"
      icon="Search"
      :title="t('views.collection.noMatchTitle')"
      :description="t('views.collection.noMatchDesc')"
    />

    <ul v-else class="space-y-1.5" role="list">
      <li
        v-for="(row, index) in rows"
        :key="row.id"
        :draggable="reorderable"
        class="group flex items-center gap-3 rounded-[11px] border bg-surface px-3 py-2.5 transition-[border-color,opacity] motion-reduce:transition-none"
        :class="[
          dragIndex === index ? 'opacity-45' : '',
          overIndex === index && dragIndex !== index
            ? 'border-accent/60'
            : 'border-line/8 hover:border-accent/30',
        ]"
        @dragstart="onDragStart(index)"
        @dragover.prevent="overIndex = index"
        @dragend="onDrop"
        @drop.prevent="onDrop"
      >
        <span
          v-if="reorderable"
          class="shrink-0 cursor-grab text-muted opacity-0 transition-opacity group-hover:opacity-100"
          :class="query || missingLang ? '!opacity-20' : ''"
          aria-hidden="true"
        >
          <GripVertical :size="15" :stroke-width="1.8" />
        </span>

        <span
          class="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-bg-tint text-ink-soft"
        >
          <component
            :is="rowGlyph(row)"
            v-if="rowGlyph(row)"
            :size="15"
            :stroke-width="1.8"
            aria-hidden="true"
          />
          <FlagBadge v-else-if="row.flagCode" :code="String(row.flagCode)" :show-code="false" />
          <span v-else class="font-mono text-[0.62rem] text-muted">{{ index + 1 }}</span>
        </span>

        <RouterLink :to="`/c/${collection.key}/${row.id}`" class="min-w-0 flex-1">
          <span class="block truncate text-[0.86rem] font-medium">{{
            titleOf(collection, row, lang)
          }}</span>
          <span v-if="subtitle(collection, row)" class="block truncate text-[0.74rem] text-muted">{{
            subtitle(collection, row)
          }}</span>
        </RouterLink>

        <span
          v-if="attachmentCount(row)"
          class="shrink-0 text-muted"
          :title="t('views.collection.hasAttachments')"
        >
          <Paperclip :size="13" :stroke-width="1.9" />
        </span>

        <TranslationChips
          v-if="collection.i18n && langs.length"
          class="shrink-0 max-700:hidden"
          :collection="collection"
          :document="row"
          :langs="langs"
        />

        <div class="flex shrink-0 items-center gap-0.5">
          <button
            v-if="collection.duplicable !== false"
            type="button"
            class="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition-colors hover:bg-bg-tint hover:text-ink"
            :title="t('common.duplicate')"
            :aria-label="t('common.duplicate')"
            @click="duplicate(row)"
          >
            <Copy :size="14" :stroke-width="1.9" />
          </button>
          <button
            type="button"
            class="grid h-7 w-7 place-items-center rounded-[7px] text-muted transition-colors hover:bg-bg-tint hover:text-rust"
            :title="t('common.delete')"
            :aria-label="t('common.delete')"
            @click="askDelete(row)"
          >
            <Trash2 :size="14" :stroke-width="1.9" />
          </button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="pending !== null"
      :title="t('views.collection.deleteTitle', { singular: singular.toLowerCase() })"
      :subject="pendingTitle"
      message="will disappear from your portfolio as soon as you confirm. Undo is available for the rest of this session."
      confirm-word="delete"
      @cancel="pending = null"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Copy, GripVertical, Paperclip, Plus, Search, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import FlagBadge from '@/components/ui/FlagBadge.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import TranslationChips from '@/components/ui/TranslationChips.vue'
import { getCollection, type CollectionDef } from '@/registry/collections'
import { collectionLabel, collectionSingular } from '@/i18n/labels'
import { iconComponent } from '@/registry/icons'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import {
  assetKeysOf,
  copyOf,
  fieldTypeOf,
  hasTranslation,
  monthLabel,
  optionKeyOf,
  subtitleOf,
  titleOf,
} from '@/utils/entity'
import { clone } from '@/utils/diff'
import type { AdminDocument } from '@/types/admin'
import { useI18n } from 'vue-i18n'

const { t, te, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const content = useContentStore()
const ui = useUiStore()

const query = ref('')
const missingLang = ref('')
const dragIndex = ref(-1)
const overIndex = ref(-1)
const pending = ref<AdminDocument | null>(null)

const collection = computed(() => getCollection(String(route.params.collection)))
const label = computed(() => (collection.value ? collectionLabel(collection.value) : ''))
const singular = computed(() => (collection.value ? collectionSingular(collection.value) : ''))
const langs = computed(() => content.langs)
const lang = computed(() => ui.editingLang || content.referenceLang)

function subtitle(def: CollectionDef, doc: AdminDocument): string {
  const raw = subtitleOf(def, doc, lang.value)
  if (!def.subtitleField || !raw) return raw

  if (fieldTypeOf(def, def.subtitleField) === 'month') return monthLabel(raw, locale.value)

  const group = optionKeyOf(def, def.subtitleField)
  const key = `vocabularies.${group}.${raw}`
  return group && te(key) ? t(key) : raw
}

const all = computed(() => (collection.value ? content.list(collection.value.key) : []))

const rows = computed(() => {
  const def = collection.value
  if (!def) return []

  const needle = query.value.trim().toLowerCase()

  return all.value.filter((doc) => {
    if (missingLang.value && hasTranslation(doc, missingLang.value)) return false
    if (!needle) return true

    const haystack = [
      titleOf(def, doc, lang.value),
      subtitle(def, doc),
      ...def.fields.map((field) => String(doc[field.name] ?? '')),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(needle)
  })
})

const reorderable = computed(
  () => Boolean(collection.value?.ordered) && !query.value && !missingLang.value,
)

const pendingTitle = computed(() =>
  pending.value && collection.value ? titleOf(collection.value, pending.value, lang.value) : '',
)

function rowGlyph(doc: AdminDocument) {
  return typeof doc.icon === 'string' ? iconComponent(doc.icon) : undefined
}

function attachmentCount(doc: AdminDocument): number {
  return collection.value ? assetKeysOf(collection.value, doc).length : 0
}

function onDragStart(index: number): void {
  if (!reorderable.value) return
  dragIndex.value = index
}

async function onDrop(): Promise<void> {
  const from = dragIndex.value
  const to = overIndex.value
  dragIndex.value = -1
  overIndex.value = -1

  if (!collection.value || from < 0 || to < 0 || from === to) return

  const ids = rows.value.map((doc) => doc.id)
  const [moved] = ids.splice(from, 1)
  ids.splice(to, 0, moved)

  try {
    await content.reorder(collection.value, ids)
  } catch (error) {
    ui.notify(
      'bad',
      t('views.collection.reorderFailed'),
      error instanceof Error ? error.message : undefined,
    )
  }
}

async function duplicate(doc: AdminDocument): Promise<void> {
  const def = collection.value
  if (!def) return

  try {
    const created = await content.create(def, copyOf(def, clone(doc)))
    ui.notify('good', t('views.collection.duplicated'), 'Opening the copy for editing')
    await router.push(`/c/${def.key}/${created.id}`)
  } catch (error) {
    ui.notify(
      'bad',
      t('views.collection.duplicateFailed'),
      error instanceof Error ? error.message : undefined,
    )
  }
}

function askDelete(doc: AdminDocument): void {
  pending.value = doc
}

async function confirmDelete(): Promise<void> {
  const def = collection.value
  const doc = pending.value
  pending.value = null
  if (!def || !doc) return

  try {
    await content.remove(def, doc.id)
    ui.notify(
      'good',
      t('views.collection.deleted'),
      'Undo from the top bar while this tab stays open',
    )
  } catch (error) {
    ui.notify(
      'bad',
      t('views.collection.deleteFailed'),
      error instanceof Error ? error.message : undefined,
    )
  }
}

watch(
  () => route.params.collection,
  () => {
    query.value = ''
    missingLang.value = ''
  },
)
</script>
