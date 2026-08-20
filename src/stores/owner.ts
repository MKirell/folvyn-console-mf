import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  ApiError,
  checkSlug,
  eraseMe,
  exportMe,
  fetchMe,
  publishPortfolio,
  unpublishPortfolio,
  updateMe,
} from '@/services/admin.api'
import { portfolioUrl } from '@/config/env'
import { setAssetPrefix } from '@/utils/assets'
import type { ConsentMode, OwnerRecord, SlugAvailability } from '@/types/admin'

export const useOwnerStore = defineStore('owner', () => {
  const record = ref<OwnerRecord | null>(null)
  const loading = ref(false)
  const busy = ref(false)
  const error = ref<string | null>(null)
  const missing = ref<string[]>([])

  let reading: Promise<void> | null = null

  const slug = computed(() => record.value?.slug ?? '')
  const status = computed(() => record.value?.status ?? 'draft')
  const published = computed(() => status.value === 'published')
  const suspended = computed(() => status.value === 'suspended')
  const consentMode = computed<ConsentMode>(() => record.value?.consentMode ?? 'measurement')
  const publicUrl = computed(() => portfolioUrl(slug.value))

  async function load(force = false): Promise<void> {
    if (record.value && !force) return
    if (reading) return reading

    loading.value = true
    error.value = null

    reading = (async () => {
      try {
        record.value = await fetchMe()
        setAssetPrefix(record.value.assetPrefix ?? '')
      } catch (cause) {
        error.value = cause instanceof Error ? cause.message : 'Could not read your account'
      } finally {
        loading.value = false
        reading = null
      }
    })()

    return reading
  }

  async function run(action: () => Promise<OwnerRecord>): Promise<void> {
    busy.value = true

    try {
      record.value = await action()
    } finally {
      busy.value = false
    }
  }

  async function publish(): Promise<void> {
    missing.value = []

    try {
      await run(publishPortfolio)
    } catch (cause) {
      missing.value = incompleteFrom(cause)
      throw cause
    }
  }

  function unpublish(): Promise<void> {
    return run(unpublishPortfolio)
  }

  function setConsentMode(mode: ConsentMode): Promise<void> {
    return run(() => updateMe({ consentMode: mode }))
  }

  function setSlug(slug: string): Promise<void> {
    return run(() => updateMe({ slug }))
  }

  function availability(slug: string): Promise<SlugAvailability> {
    return checkSlug(slug)
  }

  function exportEverything(): Promise<unknown> {
    return exportMe()
  }

  async function erase(): Promise<void> {
    busy.value = true

    try {
      await eraseMe()
      record.value = null
    } finally {
      busy.value = false
    }
  }

  return {
    record,
    loading,
    busy,
    error,
    missing,
    slug,
    status,
    published,
    suspended,
    consentMode,
    publicUrl,
    load,
    publish,
    unpublish,
    setConsentMode,
    setSlug,
    availability,
    exportEverything,
    erase,
  }
})

function incompleteFrom(cause: unknown): string[] {
  if (!(cause instanceof ApiError) || cause.status !== 422) return []
  const missing = cause.body?.details?.missing
  return Array.isArray(missing)
    ? missing.filter((item): item is string => typeof item === 'string')
    : []
}
