import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { deleteAsset, listAssets, presignUpload, putToBucket } from '@/services/admin.api'
import { COLLECTIONS, SINGLETON_COLLECTIONS } from '@/registry/collections'
import { useContentStore } from '@/stores/content'
import { assetKeysOf, titleOf } from '@/utils/entity'
import { contentTypeOf, sanitizeFilename } from '@/utils/assets'
import type { AssetObject } from '@/types/admin'

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

  async function load(force = false): Promise<void> {
    if (assets.value.length > 0 && !force) return

    loading.value = true
    error.value = null

    try {
      assets.value = await listAssets()
      available.value = true
    } catch (e) {
      available.value = false
      error.value = e instanceof Error ? e.message : 'The asset bucket is not reachable'
    } finally {
      loading.value = false
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
      const presigned = await presignUpload({ filename, contentType, size: file.size })
      await putToBucket(presigned.url, file)

      const existing = assets.value.filter((asset) => asset.key !== presigned.key)
      assets.value = [
        { key: presigned.key, size: file.size, lastModified: new Date().toISOString() },
        ...existing,
      ]

      return presigned.key
    } finally {
      uploading.value -= 1
    }
  }

  async function remove(key: string): Promise<void> {
    if ((references.value[key] ?? []).length > 0) {
      throw new Error('This file is still referenced by portfolio content')
    }
    await deleteAsset(key)
    assets.value = assets.value.filter((asset) => asset.key !== key)
  }

  return {
    assets,
    loading,
    uploading,
    error,
    available,
    references,
    orphans,
    missing,
    load,
    upload,
    remove,
  }
})
