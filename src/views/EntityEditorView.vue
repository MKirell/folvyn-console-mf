<template>
  <div v-if="!collection">
    <EmptyState title="Unknown collection" description="The sidebar lists every editable screen." />
  </div>

  <div v-else-if="!draft">
    <EmptyState
      icon="Search"
      :title="`This ${collection.singular.toLowerCase()} no longer exists`"
      description="It may have been deleted in another tab."
    >
      <AppButton variant="primary" @click="router.push(listRoute)"> Back to the list </AppButton>
    </EmptyState>
  </div>

  <form v-else class="mx-auto w-full max-w-[1180px]" @submit.prevent="save">
    <header class="mb-4 flex flex-wrap items-center gap-2.5">
      <AppButton size="sm" variant="quiet" class="max-900:order-1" @click="router.push(listRoute)">
        <ArrowLeft :size="14" :stroke-width="2" aria-hidden="true" />
        {{ collection.label }}
      </AppButton>

      <div class="min-w-0 flex-1 max-900:order-first max-900:basis-full">
        <h2 class="truncate font-disp text-[1.2rem] font-semibold tracking-tight">
          {{ isNew ? `New ${collection.singular.toLowerCase()}` : heading }}
        </h2>
        <p v-if="!isNew" class="truncate font-mono text-[0.64rem] text-muted">{{ draft.id }}</p>
      </div>

      <AppButton
        v-if="!isNew"
        size="sm"
        variant="danger"
        class="max-900:order-2 max-900:ms-auto"
        @click="confirming = true"
      >
        <Trash2 :size="13" :stroke-width="1.9" aria-hidden="true" />
        Delete
      </AppButton>
      <AppButton
        variant="primary"
        type="submit"
        class="max-900:order-3"
        :busy="saving"
        :disabled="!dirty && !isNew"
      >
        Save
        <kbd class="font-mono text-[0.62rem] opacity-70">{{ metaKey }} S</kbd>
      </AppButton>
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
      <PanelCard title="Shared fields" hint="same in every language">
        <div class="grid grid-cols-2 gap-x-4 gap-y-3.5 max-700:grid-cols-1">
          <FieldRenderer
            v-for="field in collection.fields"
            :key="field.name"
            :field="field"
            :model-value="draft[field.name]"
            :error="errors.fields[field.name]"
            @update:model-value="setField(field.name, $event)"
          />
        </div>
      </PanelCard>

      <PanelCard
        v-if="collection.i18n"
        :key="`translations:${editingLang}`"
        title="Translations"
        :hint="`${completeCount}/${langs.length} complete`"
      >
        <p v-if="errors.fields.translations" class="mb-3 text-[0.76rem] text-rust">
          {{ errors.fields.translations }}
        </p>

        <div class="space-y-3">
          <FieldRenderer
            v-for="field in collection.translated"
            :key="`${editingLang}:${field.name}`"
            :field="field"
            :model-value="translationValue(editingLang, field.name)"
            :error="errors.translations[editingLang]?.[field.name]"
            @update:model-value="setTranslation(editingLang, field.name, $event)"
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

    <ConfirmDialog
      :open="confirming"
      :title="`Delete this ${collection.singular.toLowerCase()}?`"
      :subject="heading"
      message="will disappear from your portfolio as soon as you confirm."
      confirm-word="delete"
      @cancel="confirming = false"
      @confirm="remove"
    />
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Trash2 } from '@lucide/vue'
import AppButton from '@/components/ui/AppButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PanelCard from '@/components/ui/PanelCard.vue'
import FieldRenderer from '@/components/fields/FieldRenderer.vue'
import PreviewFrame from '@/components/preview/PreviewFrame.vue'
import { buildPreviewPayload, hasPreview } from '@/utils/preview-payload'
import { getCollection, type CollectionDef } from '@/registry/collections'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'
import { ApiError } from '@/services/admin.api'
import { changedFields, clone, deepEqual } from '@/utils/diff'
import {
  blankDocument,
  blankTranslation,
  isTranslationComplete,
  mapServerErrors,
  payloadFrom,
  titleOf,
  validateDraft,
  type ValidationResult,
} from '@/utils/entity'
import { incompleteLocaleReason } from '@/utils/locale-queue'
import type { AdminDocument, TranslationEntry } from '@/types/admin'

const route = useRoute()
const router = useRouter()
const content = useContentStore()
const ui = useUiStore()

const draft = ref<AdminDocument | null>(null)
const original = ref<AdminDocument | null>(null)
const errors = ref<ValidationResult>({ fields: {}, translations: {}, ok: true })
const serverError = ref('')
const saving = ref(false)
const confirming = ref(false)

const TABS = [
  { key: 'fields' as const, label: 'Fields' },
  { key: 'preview' as const, label: 'Live preview' },
]

const tab = ref<'fields' | 'preview'>('fields')
const previewable = computed(() => hasPreview(collection.value?.key ?? ''))

const listRoute = computed(() =>
  collection.value?.key === 'locale' ? '/locales' : `/c/${collection.value?.key ?? ''}`,
)

const VIEWPORTS = [
  { key: 'desktop' as const, label: 'Desktop', width: 1512 },
  { key: 'mobile' as const, label: 'Mobile', width: 390 },
]

const viewport = ref<'desktop' | 'mobile'>('desktop')
const narrowHost = ref(false)

const offeredViewports = computed(() =>
  narrowHost.value ? VIEWPORTS.filter((option) => option.key === 'mobile') : VIEWPORTS,
)

const viewportWidth = computed(
  () => VIEWPORTS.find((option) => option.key === viewport.value)?.width ?? 1512,
)

function measureHost(): void {
  narrowHost.value = window.innerWidth < 900
  if (narrowHost.value) viewport.value = 'mobile'
}

const previewPayload = computed(() =>
  collection.value && draft.value
    ? buildPreviewPayload(collection.value, draft.value, editingLang.value, {
        locales: content.locales,
        person: content.singleton('person'),
        profile: content.singleton('profile'),
        lists: content.documents,
      })
    : {},
)

const collection = computed(() => getCollection(String(route.params.collection)))
const isNew = computed(() => route.params.id === 'new')
const langs = computed(() => content.langs)

const metaKey = computed(() =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl',
)

const dirty = computed(() => !deepEqual(draft.value, original.value))

const heading = computed(() =>
  collection.value && draft.value ? titleOf(collection.value, draft.value, editingLang.value) : '',
)

const editingLang = computed(() => ui.editingLang || content.referenceLang)

const completeCount = computed(() => langs.value.filter(isComplete).length)

function isComplete(code: string): boolean {
  return Boolean(
    collection.value && draft.value && isTranslationComplete(collection.value, draft.value, code),
  )
}

function translationValue(code: string, field: string): unknown {
  return draft.value?.translations?.[code]?.[field]
}

function setField(name: string, value: unknown): void {
  if (!draft.value) return
  draft.value = { ...draft.value, [name]: value }
}

function setTranslation(code: string, field: string, value: unknown): void {
  if (!draft.value || !collection.value) return

  const translations = { ...(draft.value.translations ?? {}) }
  const entry: TranslationEntry = { ...(translations[code] ?? blankTranslation(collection.value)) }
  entry[field] = value as TranslationEntry[string]
  translations[code] = entry
  draft.value = { ...draft.value, translations }
}

function load(): void {
  const def = collection.value
  if (!def) return

  if (isNew.value) {
    const blank = blankDocument(def, langs.value)
    draft.value = blank
    original.value = clone(blank)
    return
  }

  const found = content.find(def.key, String(route.params.id))
  if (!found) {
    draft.value = null
    original.value = null
    return
  }

  const hydrated = clone(found)
  if (def.i18n) hydrated.translations = hydrated.translations ?? {}

  draft.value = hydrated
  original.value = clone(hydrated)
}

function enablingAnIncompleteLocale(def: CollectionDef, doc: AdminDocument): string | null {
  if (def.key !== 'locale' || doc.enabled !== true) return null
  return incompleteLocaleReason(content, String(doc.code ?? ''))
}

async function save(): Promise<void> {
  const def = collection.value
  if (!def || !draft.value) return

  errors.value = validateDraft(def, draft.value, langs.value)
  serverError.value = ''

  const untranslated = enablingAnIncompleteLocale(def, draft.value)
  if (untranslated) {
    errors.value = {
      ...errors.value,
      ok: false,
      fields: { ...errors.value.fields, enabled: untranslated },
    }
  }

  if (!errors.value.ok) {
    ui.notify('warn', 'Some fields need attention')
    return
  }

  saving.value = true

  try {
    if (isNew.value) {
      const created = await content.create(def, draft.value)
      ui.dirty = false
      ui.notify('good', `${def.singular} created`)
      await router.replace(`/c/${def.key}/${created.id}`)
      return
    }

    const payload = payloadFrom(def, draft.value)
    const previous = original.value ? payloadFrom(def, original.value) : null
    const changes = changedFields(previous, payload, Object.keys(payload))

    if (Object.keys(changes).length === 0) {
      ui.notify('info', 'Nothing changed')
      return
    }

    const updated = await content.update(def, draft.value.id, changes)
    draft.value = clone(updated)
    original.value = clone(updated)
    ui.dirty = false
    ui.notify('good', `${def.singular} saved`)
  } catch (error) {
    if (error instanceof ApiError) {
      errors.value = { ...errors.value, fields: mapServerErrors(def, error.messages) }
      serverError.value = error.messages.join(' · ')
    } else {
      serverError.value = error instanceof Error ? error.message : 'The save failed'
    }
    ui.notify('bad', 'Save failed')
  } finally {
    saving.value = false
  }
}

async function remove(): Promise<void> {
  const def = collection.value
  confirming.value = false
  if (!def || !draft.value) return

  try {
    await content.remove(def, draft.value.id)
    ui.dirty = false
    ui.notify('good', `${def.singular} deleted`, 'Undo from the top bar')
    await router.push(`/c/${def.key}`)
  } catch (error) {
    ui.notify('bad', 'Delete failed', error instanceof Error ? error.message : undefined)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
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

watch([() => route.params.id, () => content.loaded], load, { immediate: true })
watch(
  dirty,
  (value) => {
    ui.dirty = value
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', measureHost)
  measureHost()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', measureHost)
  ui.dirty = false
})
</script>
