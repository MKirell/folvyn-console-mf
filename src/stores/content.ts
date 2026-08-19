import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  createDocument,
  deleteDocument,
  fetchSingleton,
  listDocuments,
  reorderDocuments,
  updateDocument,
  updateSingleton,
} from '@/services/admin.api'
import {
  COLLECTIONS,
  LIST_COLLECTIONS,
  SINGLETON_COLLECTIONS,
  type CollectionDef,
} from '@/registry/collections'
import { useHistoryStore } from '@/stores/history'
import { useUiStore } from '@/stores/ui'
import { clone } from '@/utils/diff'
import { payloadFrom, titleOf } from '@/utils/entity'
import type { AdminDocument, AdminLocale, AdminPerson, AdminProfile } from '@/types/admin'

export const useContentStore = defineStore('content', () => {
  const documents = ref<Record<string, AdminDocument[]>>({})
  const singletons = ref<Record<string, AdminDocument | null>>({})
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  const failed = computed(() => error.value !== null && !loaded.value)

  const locales = computed(() => (documents.value.locale ?? []) as AdminLocale[])
  const enabledLocales = computed(() => locales.value.filter((locale) => locale.enabled !== false))
  const langs = computed(() => locales.value.map((locale) => locale.code))
  const referenceLang = computed(() => langs.value[0] ?? 'en')

  watch(langs, (codes) => useUiStore().reconcileEditingLang(codes, codes[0] ?? ''), {
    immediate: true,
  })

  function list(key: string): AdminDocument[] {
    return documents.value[key] ?? []
  }

  function find(key: string, id: string): AdminDocument | undefined {
    return list(key).find((doc) => doc.id === id)
  }

  function labelFor(collection: CollectionDef, document: AdminDocument): string {
    const title = titleOf(collection, document, referenceLang.value)
    return title && title !== document.id ? title : collection.singular
  }

  function sorted(entries: AdminDocument[]): AdminDocument[] {
    return [...entries].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  function put(key: string, entries: AdminDocument[]): void {
    documents.value = { ...documents.value, [key]: sorted(entries) }
  }

  function renumber(key: string): void {
    const ordered = sorted(list(key)).map((doc, index) => ({ ...doc, order: index }))
    documents.value = { ...documents.value, [key]: ordered }
  }

  let inFlight: Promise<void> | null = null

  function loadAll(force = false): Promise<void> {
    if (loaded.value && !force) return Promise.resolve()
    if (inFlight && !force) return inFlight

    inFlight = fetchEverything().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  async function fetchEverything(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const lists = await Promise.all(
        LIST_COLLECTIONS.map(async (collection) => ({
          key: collection.key,
          entries: await listDocuments(collection.path),
        })),
      )

      const next: Record<string, AdminDocument[]> = {}
      for (const { key, entries } of lists) next[key] = sorted(entries)
      documents.value = next

      const singles = await Promise.all(
        SINGLETON_COLLECTIONS.map(async (collection) => ({
          key: collection.key,
          document: await fetchSingleton(collection.path).catch(() => null),
        })),
      )

      const nextSingletons: Record<string, AdminDocument | null> = {}
      for (const { key, document } of singles) nextSingletons[key] = document
      singletons.value = nextSingletons
      loaded.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'The console could not reach the API'
    } finally {
      loading.value = false
    }
  }

  async function create(collection: CollectionDef, draft: AdminDocument): Promise<AdminDocument> {
    const created = await createDocument(collection.path, payloadFrom(collection, draft))
    const existing = list(collection.key)
    const shifted =
      collection.ordered && created.order === 0
        ? existing.map((doc) => ({ ...doc, order: (doc.order ?? 0) + 1 }))
        : existing

    put(collection.key, [...shifted, created])
    if (collection.ordered) renumber(collection.key)

    useHistoryStore().record(`Create ${collection.singular.toLowerCase()}`, async () => {
      await deleteDocument(collection.path, created.id)
      put(
        collection.key,
        list(collection.key).filter((doc) => doc.id !== created.id),
      )
    })

    return created
  }

  async function update(
    collection: CollectionDef,
    id: string,
    changes: Record<string, unknown>,
  ): Promise<AdminDocument> {
    const before = find(collection.key, id)
    if (before) {
      await useHistoryStore().snapshot(
        collection.key,
        id,
        labelFor(collection, before),
        clone(before),
      )
    }

    const updated = await updateDocument(collection.path, id, changes)
    put(
      collection.key,
      list(collection.key).map((doc) => (doc.id === id ? updated : doc)),
    )

    if (before) {
      const inverse: Record<string, unknown> = {}
      for (const key of Object.keys(changes)) {
        inverse[key] = before[key] === undefined ? null : clone(before[key])
      }

      useHistoryStore().record(`Edit ${collection.singular.toLowerCase()}`, async () => {
        const restored = await updateDocument(collection.path, id, inverse)
        put(
          collection.key,
          list(collection.key).map((doc) => (doc.id === id ? restored : doc)),
        )
      })
    }

    return updated
  }

  async function remove(collection: CollectionDef, id: string): Promise<void> {
    const before = find(collection.key, id)
    const previous = list(collection.key)

    if (before) {
      await useHistoryStore().snapshot(
        collection.key,
        id,
        labelFor(collection, before),
        clone(before),
      )
    }

    put(
      collection.key,
      previous.filter((doc) => doc.id !== id),
    )

    try {
      await deleteDocument(collection.path, id)
      if (collection.ordered) renumber(collection.key)
    } catch (e) {
      put(collection.key, previous)
      throw e
    }

    if (before) {
      useHistoryStore().record(`Delete ${collection.singular.toLowerCase()}`, async () => {
        const restored = await createDocument(collection.path, payloadFrom(collection, before))
        put(collection.key, [...list(collection.key), restored])
      })
    }
  }

  async function reorder(collection: CollectionDef, orderedIds: string[]): Promise<void> {
    const previous = list(collection.key)
    const entries = orderedIds.map((id, index) => ({ id, order: index }))
    const lookup = new Map(previous.map((doc) => [doc.id, doc]))

    const optimistic: AdminDocument[] = []
    orderedIds.forEach((id, index) => {
      const doc = lookup.get(id)
      if (doc) optimistic.push({ ...doc, order: index })
    })
    put(collection.key, optimistic)

    try {
      put(collection.key, await reorderDocuments(collection.path, entries))
    } catch (e) {
      put(collection.key, previous)
      throw e
    }

    const inverse = previous.map((doc, index) => ({ id: doc.id, order: index }))
    useHistoryStore().record(`Reorder ${collection.label.toLowerCase()}`, async () => {
      put(collection.key, await reorderDocuments(collection.path, inverse))
    })
  }

  async function saveSingleton(
    collection: CollectionDef,
    changes: Record<string, unknown>,
  ): Promise<AdminDocument> {
    const before = singletons.value[collection.key]
    if (before) {
      await useHistoryStore().snapshot(
        collection.key,
        before.id,
        labelFor(collection, before),
        clone(before),
      )
    }

    const updated = await updateSingleton(collection.path, changes)
    singletons.value = { ...singletons.value, [collection.key]: updated }

    if (before) {
      const inverse: Record<string, unknown> = {}
      for (const key of Object.keys(changes)) {
        inverse[key] = before[key] === undefined ? null : clone(before[key])
      }

      useHistoryStore().record(`Edit ${collection.singular.toLowerCase()}`, async () => {
        const reverted = await updateSingleton(collection.path, inverse)
        singletons.value = { ...singletons.value, [collection.key]: reverted }
      })
    }

    return updated
  }

  function singleton(key: string): AdminDocument | null {
    return singletons.value[key] ?? null
  }

  const counts = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const collection of LIST_COLLECTIONS) result[collection.key] = list(collection.key).length
    for (const collection of SINGLETON_COLLECTIONS) {
      result[collection.key] = singletons.value[collection.key] ? 1 : 0
    }
    return result
  })

  function exportAll(): string {
    const payload: Record<string, unknown> = { exportedAt: new Date().toISOString() }
    for (const collection of Object.values(COLLECTIONS)) {
      if (collection.mode === 'list') payload[collection.key] = list(collection.key)
    }
    for (const collection of SINGLETON_COLLECTIONS) {
      payload[collection.key] = singletons.value[collection.key]
    }
    return JSON.stringify(payload, null, 2)
  }

  return {
    documents,
    singletons,
    person: computed(() => singletons.value.person as AdminPerson | null),
    profile: computed(() => singletons.value.profile as AdminProfile | null),
    loading,
    loaded,
    error,
    failed,
    locales,
    enabledLocales,
    langs,
    referenceLang,
    counts,
    list,
    find,
    loadAll,
    create,
    update,
    remove,
    reorder,
    saveSingleton,
    singleton,
    exportAll,
  }
})
