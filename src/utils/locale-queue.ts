import { SINGLETON_COLLECTIONS, TRANSLATED_COLLECTIONS, fieldLabel } from '@/registry/collections'
import { collectionLabel, collectionSingular } from '@/i18n/labels'
import type { useContentStore } from '@/stores/content'
import { isTranslationComplete, titleOf } from '@/utils/entity'

type ContentStore = ReturnType<typeof useContentStore>

export interface QueueTask {
  key: string
  label: string
  detail: string
  done: boolean
  to: string
}

export interface QueueGroup {
  key: string
  label: string
  tasks: QueueTask[]
}

export interface LocaleProgress {
  total: number
  done: number
  percent: number
  groups: QueueGroup[]
}

export function localeProgress(content: ContentStore, code: string): LocaleProgress {
  const groups: QueueGroup[] = []
  const reference = content.referenceLang

  const singletons = SINGLETON_COLLECTIONS.filter(
    (collection) => collection.i18n && collection.translated.length > 0,
  )

  const foundation = singletons
    .map((collection) => ({ collection, doc: content.singleton(collection.key) }))
    .filter((entry) => entry.doc !== null)

  if (foundation.length > 0) {
    groups.push({
      key: 'foundation',
      label: 'Foundation',
      tasks: foundation.map(({ collection, doc }) => ({
        key: collection.key,
        label: collectionSingular(collection),
        detail: collection.translated.map((field) => fieldLabel(field)).join(' · '),
        done: isTranslationComplete(collection, doc!, code),
        to: `/${collection.key}?lang=${code}`,
      })),
    })
  }

  for (const collection of TRANSLATED_COLLECTIONS) {
    const docs = content.list(collection.key)
    if (docs.length === 0 || collection.translated.length === 0) continue

    groups.push({
      key: collection.key,
      label: collectionLabel(collection),
      tasks: docs.map((doc) => ({
        key: doc.id,
        label: titleOf(collection, doc, reference),
        detail: collection.translated.map((field) => fieldLabel(field)).join(' · '),
        done: isTranslationComplete(collection, doc, code),
        to: `/c/${collection.key}/${doc.id}?lang=${code}`,
      })),
    })
  }

  const tasks = groups.flatMap((group) => group.tasks)
  const done = tasks.filter((task) => task.done).length

  return {
    total: tasks.length,
    done,
    percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
    groups,
  }
}

export function incompleteLocaleReason(content: ContentStore, code: string): string | null {
  const { percent, groups } = localeProgress(content, code)
  if (percent >= 100) return null

  const missing = groups
    .flatMap((group) => group.tasks)
    .filter((task) => !task.done)
    .map((task) => task.label)

  const first = missing.slice(0, 3).join(', ')
  const rest = missing.length > 3 ? ` and ${missing.length - 3} more` : ''

  return `Only ${percent}% translated — finish ${first}${rest} before visitors can pick it.`
}
