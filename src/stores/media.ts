import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { deleteAsset, listAssets, presignUpload, putToBucket } from '@/services/admin.api'
import { COLLECTIONS, SINGLETON_COLLECTIONS } from '@/registry/collections'
import { useContentStore } from '@/stores/content'
import { useOwnerStore } from '@/stores/owner'
import { assetKeysOf, titleOf } from '@/utils/entity'
import * as local from '@/services/local-assets'
import { assetPrefix, assetUrl, contentTypeOf, sanitizeFilename } from '@/utils/assets'
import type { AssetObject } from '@/types/admin'

export type AssetSource = 'bucket' | 'repo'

function asIsoDate(value: string | null): string {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString()
}

export interface AssetReference {
  collection: string
  label: string
  documentId: string
}

export const useMediaStore = defineStore('media', () => {
  const assets = ref<AssetObject[]>([])
  const loading = ref(false)
  const uploading = ref(0)
  const error = ref<string | null>(null)
  const available = ref(true)
  const source = ref<AssetSource>('bucket')

  const writesToRepo = computed(() => source.value === 'repo' && local.localAssetsEnabled())
  const writable = computed(() => source.value === 'bucket' || writesToRepo.value)

  async function load(force = false): Promise<void> {
    if (assets.value.length > 0 && !force) return

    loading.value = true
    error.value = null

    try {
      const owner = useOwnerStore()
      await owner.load()

      if (!owner.record) {
        available.value = false
        error.value = owner.error ?? 'Could not read your account'
        return
      }

      if (assetPrefix()) {
        assets.value = await listAssets()
        source.value = 'bucket'
        available.value = true
        return
      }

      source.value = 'repo'

      if (local.localAssetsEnabled()) {
        assets.value = await local.listLocalAssets()
        available.value = true
        return
      }

      assets.value = await listRepoAssets()
      available.value = false
    } catch (e) {
      available.value = false
      error.value = e instanceof Error ? e.message : 'The asset bucket is not reachable'
    } finally {
      loading.value = false
    }
  }

  async function listRepoAssets(): Promise<AssetObject[]> {
    const content = useContentStore()
    await content.loadAll()

    const probed = await Promise.all(Object.keys(references.value).map(probeRepoAsset))
    return probed
      .filter((asset): asset is AssetObject => asset !== null)
      .sort((a, b) => a.key.localeCompare(b.key))
  }

  async function probeRepoAsset(key: string): Promise<AssetObject | null> {
    const url = assetUrl(key)
    if (!url) return null

    const unknown: AssetObject = { key, size: 0, lastModified: '' }

    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (!response.ok) return null

      return {
        key,
        size: Number(response.headers.get('content-length') ?? 0),
        lastModified: asIsoDate(response.headers.get('last-modified')),
      }
    } catch {
      return unknown
    }
  }

  const references = computed<Record<string, AssetReference[]>>(() => {
    const content = useContentStore()
    const lang = content.referenceLang
    const map: Record<string, AssetReference[]> = {}

    function add(key: string, reference: AssetReference): void {
      if (!key) return
      map[key] = [...(map[key] ?? []), reference]
    }

    for (const collection of Object.values(COLLECTIONS)) {
      if (collection.mode !== 'list') continue
      for (const doc of content.list(collection.key)) {
        for (const key of assetKeysOf(collection, doc)) {
          add(key, {
            collection: collection.label,
            label: titleOf(collection, doc, lang),
            documentId: doc.id,
          })
        }
      }
    }

    for (const collection of SINGLETON_COLLECTIONS) {
      const document = content.singleton(collection.key)
      if (!document) continue

      for (const key of assetKeysOf(collection, document)) {
        add(key, {
          collection: collection.singular,
          label: collection.singular,
          documentId: document.id,
        })
      }
    }

    return map
  })

  const orphans = computed(() =>
    assets.value.filter((asset) => (references.value[asset.key] ?? []).length === 0),
  )

  const missing = computed(() => {
    const present = new Set(assets.value.map((asset) => asset.key))
    return Object.keys(references.value).filter((key) => !present.has(key))
  })

  async function upload(file: File): Promise<string> {
    const filename = sanitizeFilename(file.name)
    const contentType = contentTypeOf(filename)

    if (!contentType) {
      throw new Error(`${filename} is not an accepted file type`)
    }

    uploading.value += 1
    try {
      const stored = writesToRepo.value
        ? await local.putLocalAsset(filename, file)
        : await putToBucketFor(filename, contentType, file)

      assets.value = [stored, ...assets.value.filter((asset) => asset.key !== stored.key)]
      return stored.key
    } finally {
      uploading.value -= 1
    }
  }

  async function putToBucketFor(
    filename: string,
    contentType: string,
    file: File,
  ): Promise<AssetObject> {
    const presigned = await presignUpload({ filename, contentType, size: file.size })
    await putToBucket(presigned.url, file)
    return { key: presigned.key, size: file.size, lastModified: new Date().toISOString() }
  }

  async function remove(key: string): Promise<void> {
    if ((references.value[key] ?? []).length > 0) {
      throw new Error('This file is still referenced by portfolio content')
    }

    if (writesToRepo.value) await local.deleteLocalAsset(key)
    else await deleteAsset(key)

    assets.value = assets.value.filter((asset) => asset.key !== key)
  }

  return {
    assets,
    loading,
    uploading,
    error,
    available,
    source,
    writable,
    references,
    orphans,
    missing,
    load,
    upload,
    remove,
  }
})
