<template>
  <form v-if="ready" class="mx-auto w-full max-w-[1180px]" @submit.prevent="save">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <div class="min-w-0 flex-1 max-700:basis-full">
        <h2 class="font-disp text-[1.3rem] font-semibold tracking-tight">{{ heading }}</h2>
        <p class="mt-0.5 text-[0.78rem] text-muted">{{ blurb }}</p>
      </div>
      <AppButton variant="primary" type="submit" :busy="saving" :disabled="!dirty">Save</AppButton>
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
      aria-label="Editor view"
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
      <PanelCard v-for="group in plainGroups" :key="group.title" :title="group.title">
        <div class="grid grid-cols-3 gap-x-4 gap-y-3.5 max-900:grid-cols-2 max-700:grid-cols-1">
          <FieldRenderer
            v-for="entry in group.entries"
            :key="`${entry.key}:${entry.field.name}`"
            :field="entry.field"
            :model-value="drafts[entry.key]?.[entry.field.name]"
            :error="errorsFor(entry.key).fields[entry.field.name]"
            @update:model-value="setField(entry.key, entry.field.name, $event)"
          />
        </div>
      </PanelCard>

      <PanelCard
        v-if="assetFields.length"
        title="Files"
        hint="stored as keys, served from the bucket"
      >
        <div class="grid grid-cols-1 gap-x-4 gap-y-3.5">
          <FieldRenderer
            v-for="entry in assetFields"
            :key="`${entry.key}:${entry.field.name}`"
            :field="entry.field"
            :model-value="drafts[entry.key]?.[entry.field.name]"
            :error="errorsFor(entry.key).fields[entry.field.name]"
            @update:model-value="setField(entry.key, entry.field.name, $event)"
          />
        </div>
      </PanelCard>

      <PanelCard
        v-if="translatedFields.length"
        :key="`translations:${editingLang}`"
        title="Translations"
        :hint="`${langs.length} locales`"
      >
        <div class="space-y-3">
          <FieldRenderer
            v-for="entry in translatedFields"
            :key="`${editingLang}:${entry.key}:${entry.field.name}`"
            :field="entry.field"
            :model-value="drafts[entry.key]?.translations?.[editingLang]?.[entry.field.name]"
            :error="errorsFor(entry.key).translations[editingLang]?.[entry.field.name]"
            @update:model-value="setTranslation(entry.key, editingLang, entry.field.name, $event)"
          />
        </div>
      </PanelCard>
    </div>

    <div v-if="previewable && tab === 'preview'">
      <PanelCard title="Live preview" :hint="`as ${editingLang} reads it`">
        <template #actions>
          <div
            v-if="offeredViewports.length > 1"
            class="flex items-center gap-0.5 rounded-[9px] border border-line/8 bg-bg p-[3px]"
            role="group"
            aria-label="Preview viewport"
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

  <EmptyState
    v-else
    icon="User"
    :title="`The ${heading.toLowerCase()} document has not loaded`"
    description="It arrives with the rest of the content."
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import FieldRenderer from '@/components/fields/FieldRenderer.vue'
import PreviewFrame from '@/components/preview/PreviewFrame.vue'
import { buildPreviewPayload, hasPreview } from '@/utils/preview-payload'
import { COLLECTIONS, type CollectionDef, type FieldDef } from '@/registry/collections'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import { ApiError } from '@/services/admin.api'
import { changedFields, clone, deepEqual } from '@/utils/diff'
import {
  blankTranslation,
  mapServerErrors,
  payloadFrom,
  validateDraft,
  type ValidationResult,
} from '@/utils/entity'
import type { AdminDocument, TranslationEntry } from '@/types/admin'

const EMPTY: ValidationResult = { fields: {}, translations: {}, ok: true }

const route = useRoute()
const content = useContentStore()
const ui = useUiStore()

const collection = computed(
  () => COLLECTIONS[String(route.meta.collection ?? 'person')] ?? COLLECTIONS.person,
)
const collections = computed<CollectionDef[]>(() => [collection.value])

const heading = computed(() => (route.meta.title as string | undefined) ?? collection.value.label)
const blurb = computed(() => (route.meta.blurb as string | undefined) ?? '')

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

const plainFields = computed(() =>
  collections.value.flatMap((collection) =>
    collection.fields
      .filter((field) => !field.type.startsWith('asset'))
      .map((field) => ({ key: collection.key, field })),
  ),
)

const assetFields = computed(() =>
  collections.value.flatMap((collection) =>
    collection.fields
      .filter((field) => field.type.startsWith('asset'))
      .map((field) => ({ key: collection.key, field })),
  ),
)

const GROUP_ORDER = ['Details', 'Hero', 'About']
const AS_DETAILS = new Set(['Identity', 'Contact', 'Location'])
const TRANSLATION_ORDER = ['Identity', 'Hero', 'About', 'Location', 'Details', 'Contact']

function grouped(entries: { key: string; field: FieldDef }[], order: string[] = GROUP_ORDER) {
  const buckets = new Map<string, { key: string; field: FieldDef }[]>()

  for (const entry of entries) {
    const declared = entry.field.group ?? 'Details'
    const title = order === GROUP_ORDER && AS_DETAILS.has(declared) ? 'Details' : declared
    buckets.set(title, [...(buckets.get(title) ?? []), entry])
  }

  return [...buckets.entries()]
    .map(([title, list]) => ({ title, entries: list }))
    .sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title))
}

const plainGroups = computed(() => grouped(plainFields.value))

const TABS = [
  { key: 'fields' as const, label: 'Fields' },
  { key: 'preview' as const, label: 'Live preview' },
]

const VIEWPORTS = [
  { key: 'desktop' as const, label: 'Desktop', width: 1512 },
  { key: 'mobile' as const, label: 'Mobile', width: 390 },
]

const tab = ref<'fields' | 'preview'>('fields')
const viewport = ref<'desktop' | 'mobile'>('desktop')
const narrowHost = ref(false)

const previewable = computed(() => hasPreview(collection.value.key))

const offeredViewports = computed(() =>
  narrowHost.value ? VIEWPORTS.filter((option) => option.key === 'mobile') : VIEWPORTS,
)

const viewportWidth = computed(
  () => VIEWPORTS.find((option) => option.key === viewport.value)?.width ?? 1512,
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

const translatedFields = computed(() =>
  grouped(
    collections.value.flatMap((collection) =>
      collection.translated.map((field) => ({ key: collection.key, field })),
    ),
    TRANSLATION_ORDER,
  ).flatMap((group) => group.entries),
)

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
    nextDrafts[collection.key] = document ? clone(document) : null
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
    ui.notify('warn', 'Some fields need attention')
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
      const changes = changedFields(previous, payload, Object.keys(payload))
      if (Object.keys(changes).length === 0) continue

      const updated = await content.saveSingleton(collection, changes)
      drafts.value = { ...drafts.value, [collection.key]: clone(updated) }
      originals.value = { ...originals.value, [collection.key]: clone(updated) }
      saved += 1
    }

    if (saved === 0) {
      ui.notify('info', 'Nothing changed')
      return
    }

    ui.dirty = false
    ui.notify('good', `${heading.value} saved`)
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
    ui.notify('bad', 'Save failed')
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
