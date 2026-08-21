<template>
  <form v-if="ready" class="mx-auto w-full max-w-[1180px]" @submit.prevent="save">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">{{ heading }}</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">{{ blurb }}</p>
      </div>
      <AppButton variant="primary" type="submit" :busy="saving" :disabled="!dirty">{{
        t('common.save')
      }}</AppButton>
    </header>

    <p
      v-if="serverError"
      class="mb-4 rounded-[10px] border border-rust/35 bg-rust/8 px-3.5 py-2.5 text-[0.8rem] text-rust"
    >
      {{ serverError }}
    </p>

    <div
      v-if="previewable"
      class="mb-4 flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-surface p-[3px]"
      role="tablist"
      :aria-label="t('views.singleton.editorView')"
    >
      <button
        v-for="option in TABS"
        :key="option.key"
        type="button"
        role="tab"
        class="rounded-[7px] px-3 py-[5px] text-[0.78rem] font-medium transition-colors"
        :class="option.key === tab ? 'bg-accent/14 text-accent-deep' : 'text-muted hover:text-ink'"
        :aria-selected="option.key === tab"
        @click="tab = option.key"
      >
        {{ option.label }}
      </button>
    </div>

    <div v-show="!previewable || tab === 'fields'" class="space-y-4">
      <PanelCard
        v-for="group in groups"
        :key="group.title"
        :title="groupTitle(group.title)"
        :hint="group.assets ? filesHint : groupHint(group.title)"
      >
        <template v-if="translatable(group)" #actions>
          <span
            class="shrink-0 rounded-[5px] border px-1.5 py-[1px] font-mono text-[0.62rem] tabular-nums"
            :class="
              completeCount === langs.length
                ? 'border-accent/30 bg-accent/12 text-accent-deep'
                : 'border-dashed border-line/25 text-muted'
            "
            :title="t('views.entity.complete', { done: completeCount, total: langs.length })"
            >{{ completeCount }}/{{ langs.length }}</span
          >
        </template>

        <div
          :class="
            group.assets
              ? group.columns > 1
                ? 'grid grid-cols-5 gap-x-4 gap-y-3.5 max-900:grid-cols-1'
                : 'grid grid-cols-1 gap-x-4 gap-y-3.5'
              : 'grid grid-cols-2 gap-x-4 gap-y-3.5 max-700:grid-cols-1'
          "
          :style="group.preview ? assetRows(group.entries.length) : undefined"
        >
          <AssetPreview
            v-if="group.preview"
            :model-value="assetText(draftOf()?.[group.preview.name])"
          />

          <FieldRenderer
            v-for="entry in group.entries"
            :key="`${entry.translated ? editingLang : 'shared'}:${entry.field.name}`"
            :field="entry.field"
            :full="entry.full"
            :span="entry.span"
            :bare="entry.field.name === group.preview?.name"
            :locale="entry.translated ? editingLang : ''"
            :translated="entry.translated && hasValue(translationOf(entry.field.name))"
            :model-value="valueOf(entry)"
            :error="errorOf(entry)"
            @update:model-value="write(entry, $event)"
          />
        </div>
      </PanelCard>
    </div>

    <div v-if="previewable && tab === 'preview'">
      <PanelCard
        :title="t('views.singleton.tabPreview')"
        :hint="t('views.singleton.previewHint', { lang: editingLang })"
      >
        <template #actions>
          <div
            v-if="offeredViewports.length > 1"
            class="flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-bg p-[3px]"
            role="group"
            :aria-label="t('views.singleton.previewViewport')"
          >
            <button
              v-for="option in offeredViewports"
              :key="option.key"
              type="button"
              class="rounded-[6px] px-2 py-[3px] font-mono text-[0.66rem] uppercase transition-colors"
              :class="
                option.key === viewport
                  ? 'bg-accent/14 text-accent-deep'
                  : 'text-muted hover:text-ink'
              "
              :aria-pressed="option.key === viewport"
              @click="viewport = option.key"
            >
              {{ option.label }}
            </button>
          </div>
        </template>

        <PreviewFrame
          :width="viewportWidth"
          :scroll-inside="viewport === 'mobile'"
          :section="collection.key"
          :payload="previewPayload"
        />
      </PanelCard>
    </div>
  </form>

  <SkeletonForm v-else-if="!content.loaded && !content.failed" :heading="heading" :blurb="blurb" />

  <div v-else class="mx-auto w-full max-w-[1180px]">
    <header class="mb-4">
      <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">{{ heading }}</h2>
      <p class="mt-0.5 text-[0.78rem] text-muted">{{ blurb }}</p>
    </header>

    <EmptyState
      v-if="content.failed"
      icon="Shield"
      :title="t('errors.singleton', { heading })"
      :description="content.error ?? t('common.unreachableDesc')"
    >
      <AppButton variant="primary" :busy="content.loading" @click="content.loadAll(true)">{{
        t('common.retry')
      }}</AppButton>
    </EmptyState>

    <EmptyState
      v-else
      icon="User"
      :title="t('views.singleton.notLoadedTitle', { heading: heading.toLowerCase() })"
      :description="t('views.singleton.notLoadedDesc')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import AssetPreview from '@/components/fields/AssetPreview.vue'
import FieldRenderer from '@/components/fields/FieldRenderer.vue'
import PreviewFrame from '@/components/preview/PreviewFrame.vue'
import { buildPreviewPayload, hasPreview } from '@/utils/preview-payload'
import { COLLECTIONS, type CollectionDef } from '@/registry/collections'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import { ApiError } from '@/services/admin.api'
import { changedFields, clone, deepEqual, writableKeys } from '@/utils/diff'
import {
  blankDocument,
  blankTranslation,
  isTranslationComplete,
  mapServerErrors,
  payloadFrom,
  validateDraft,
  type ValidationResult,
} from '@/utils/entity'
import type { AdminDocument, TranslationEntry } from '@/types/admin'
import { useI18n } from 'vue-i18n'
import { fieldGroups, hasValue, type FieldEntry, type FieldGroup } from '@/utils/field-groups'
import {
  collectionBlurb,
  collectionFilesHint,
  collectionGroupHint,
  collectionLabel,
} from '@/i18n/labels'

const EMPTY: ValidationResult = { fields: {}, translations: {}, ok: true }

const { t, te } = useI18n()
const route = useRoute()
const content = useContentStore()
const ui = useUiStore()

const collection = computed(
  () => COLLECTIONS[String(route.meta.collection ?? 'person')] ?? COLLECTIONS.person,
)
const collections = computed<CollectionDef[]>(() => [collection.value])

const heading = computed(() => collectionLabel(collection.value))
const blurb = computed(() =>
  collectionBlurb(collection.value, (route.meta.blurb as string | undefined) ?? ''),
)

const drafts = ref<Record<string, AdminDocument | null>>({})
const originals = ref<Record<string, AdminDocument | null>>({})
const errors = ref<Record<string, ValidationResult>>({})
const serverError = ref('')
const saving = ref(false)

const langs = computed(() => content.langs)
const editingLang = computed(() => ui.editingLang || content.referenceLang)

const ready = computed(() => collections.value.some((entry) => drafts.value[entry.key]))
const dirty = computed(() =>
  collections.value.some(
    (entry) => !deepEqual(drafts.value[entry.key], originals.value[entry.key]),
  ),
)

const groups = computed(() => fieldGroups(collection.value))

const completeCount = computed(
  () =>
    langs.value.filter((code) => {
      const draft = draftOf()
      return draft ? isTranslationComplete(collection.value, draft, code) : false
    }).length,
)

function translatable(group: FieldGroup): boolean {
  return collection.value.i18n && group.entries.some((entry) => entry.translated)
}
const filesHint = computed(() =>
  collectionFilesHint(collection.value, t('views.singleton.filesHint')),
)

function draftOf(): AdminDocument | null {
  return drafts.value[collection.value.key] ?? null
}

function translationOf(name: string): unknown {
  return draftOf()?.translations?.[editingLang.value]?.[name]
}

function valueOf(entry: FieldEntry): unknown {
  return entry.translated ? translationOf(entry.field.name) : draftOf()?.[entry.field.name]
}

function errorOf(entry: FieldEntry): string | undefined {
  const found = errorsFor(collection.value.key)
  return entry.translated
    ? found.translations[editingLang.value]?.[entry.field.name]
    : found.fields[entry.field.name]
}

function write(entry: FieldEntry, value: unknown): void {
  if (entry.translated) {
    setTranslation(collection.value.key, editingLang.value, entry.field.name, value)
    return
  }
  setField(collection.value.key, entry.field.name, value)
}

function assetRows(count: number): Record<string, string> {
  return { gridTemplateRows: `repeat(${count}, auto)` }
}

function assetText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function groupHint(title: string): string {
  return collection.value ? collectionGroupHint(collection.value, title) : ''
}

function groupTitle(title: string): string {
  return te(`groups.${title}`) ? t(`groups.${title}`) : title
}

const TABS = computed(() => [
  { key: 'fields' as const, label: t('views.singleton.tabFields') },
  { key: 'preview' as const, label: t('views.singleton.tabPreview') },
])

const VIEWPORTS = computed(() => [
  { key: 'desktop' as const, label: t('ui.desktop'), width: 1512 },
  { key: 'mobile' as const, label: t('ui.mobile'), width: 390 },
])

const tab = ref<'fields' | 'preview'>('fields')
const viewport = ref<'desktop' | 'mobile'>('desktop')
const narrowHost = ref(false)

const previewable = computed(() => hasPreview(collection.value.key))

const offeredViewports = computed(() =>
  narrowHost.value ? VIEWPORTS.value.filter((option) => option.key === 'mobile') : VIEWPORTS.value,
)

const viewportWidth = computed(
  () => VIEWPORTS.value.find((option) => option.key === viewport.value)?.width ?? 1512,
)

const previewPayload = computed(() => {
  const draft = drafts.value[collection.value.key]
  if (!draft) return {}

  const person = drafts.value.person ?? content.singleton('person')
  const profile = drafts.value.profile ?? content.singleton('profile')

  return buildPreviewPayload(collection.value, draft, editingLang.value, {
    locales: content.locales,
    person: collection.value.key === 'person' ? draft : person,
    profile: collection.value.key === 'profile' ? draft : profile,
    lists: content.documents,
  })
})

function measureHost(): void {
  narrowHost.value = window.innerWidth < 900
  if (narrowHost.value) viewport.value = 'mobile'
}

function errorsFor(key: string): ValidationResult {
  return errors.value[key] ?? EMPTY
}

function setField(key: string, name: string, value: unknown): void {
  const draft = drafts.value[key]
  if (!draft) return
  drafts.value = { ...drafts.value, [key]: { ...draft, [name]: value } }
}

function setTranslation(key: string, code: string, field: string, value: unknown): void {
  const draft = drafts.value[key]
  const collection = COLLECTIONS[key]
  if (!draft || !collection) return

  const translations = { ...(draft.translations ?? {}) }
  const entry: TranslationEntry = { ...(translations[code] ?? blankTranslation(collection)) }
  entry[field] = value as TranslationEntry[string]
  translations[code] = entry

  drafts.value = { ...drafts.value, [key]: { ...draft, translations } }
}

function load(): void {
  const nextDrafts: Record<string, AdminDocument | null> = {}
  const nextOriginals: Record<string, AdminDocument | null> = {}

  for (const collection of collections.value) {
    const document = content.singleton(collection.key)
    nextDrafts[collection.key] = document ? clone(document) : blankDocument(collection, langs.value)
    nextOriginals[collection.key] = document ? clone(document) : null
  }

  drafts.value = nextDrafts
  originals.value = nextOriginals
}

async function save(): Promise<void> {
  const found: Record<string, ValidationResult> = {}
  serverError.value = ''

  for (const collection of collections.value) {
    const draft = drafts.value[collection.key]
    if (!draft) continue
    found[collection.key] = validateDraft(collection, draft, langs.value)
  }

  errors.value = found

  if (Object.values(found).some((result) => !result.ok)) {
    ui.notify('warn', t('views.singleton.needsAttention'))
    return
  }

  saving.value = true

  try {
    let saved = 0

    for (const collection of collections.value) {
      const draft = drafts.value[collection.key]
      if (!draft) continue

      const payload = payloadFrom(collection, draft)
      const before = originals.value[collection.key]
      const previous = before ? payloadFrom(collection, before) : null
      const changes = changedFields(previous, payload, writableKeys(previous, payload))
      if (Object.keys(changes).length === 0) continue

      const updated = await content.saveSingleton(collection, changes)
      drafts.value = { ...drafts.value, [collection.key]: clone(updated) }
      originals.value = { ...originals.value, [collection.key]: clone(updated) }
      saved += 1
    }

    if (saved === 0) {
      ui.notify('info', t('views.singleton.nothingChanged'))
      return
    }

    ui.dirty = false
    ui.notify('good', t('views.singleton.saved', { heading: heading.value }))
  } catch (error) {
    if (error instanceof ApiError) {
      const first = collections.value[0]
      if (first) {
        errors.value = {
          ...errors.value,
          [first.key]: {
            ...errorsFor(first.key),
            fields: mapServerErrors(first, error.messages),
          },
        }
      }
      serverError.value = error.messages.join(' · ')
    } else {
      serverError.value = error instanceof Error ? error.message : 'The save failed'
    }
    ui.notify('bad', t('views.singleton.saveFailed'))
  } finally {
    saving.value = false
  }
}

watch(
  () => route.query.lang,
  (requested) => {
    if (typeof requested !== 'string') return
    if (!content.langs.includes(requested)) return
    ui.setEditingLang(requested)
  },
  { immediate: true },
)

watch([() => content.singletons, collections], load, { immediate: true, deep: true })
watch(dirty, (value) => {
  ui.dirty = value
})

onMounted(() => {
  window.addEventListener('resize', measureHost)
  measureHost()
})

onUnmounted(() => window.removeEventListener('resize', measureHost))
</script>
