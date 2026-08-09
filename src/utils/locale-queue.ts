import { TRANSLATED_COLLECTIONS } from '@/registry/collections'
import type { useContentStore } from '@/stores/content'
import { isTranslationComplete, titleOf } from '@/utils/entity'

type ContentStore = ReturnType<typeof useContentStore>

function hasProfileTranslation(content: ContentStore, code: string): boolean {
  const entry = content.profile?.translations?.[code]
  return Boolean(entry && entry.tagline)
}

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

  const locale = content.locales.find((entry) => entry.code === code)
  groups.push({
    key: 'foundation',
    label: 'Foundation',
    tasks: [
      {
        key: 'locale-row',
        label: 'Locale row',
        detail: locale ? `${locale.label} · flag ${locale.flagCode}` : 'Not created yet',
        done: Boolean(locale),
        to: locale ? `/c/locale/${locale.id}` : '/c/locale/new',
      },
      {
        key: 'profile',
        label: 'Hero',
        detail: hasProfileTranslation(content, code)
          ? 'Written — subtitles, tagline, about and contact blurb'
          : 'Missing — the hero and about section fall back to nothing',
        done: hasProfileTranslation(content, code),
        to: `/profile?lang=${code}`,
      },
    ],
  })

  const reference = content.referenceLang

  for (const collection of TRANSLATED_COLLECTIONS) {
    const docs = content.list(collection.key)
    if (docs.length === 0) continue

    groups.push({
      key: collection.key,
      label: collection.label,
      tasks: docs.map((doc) => ({
        key: doc.id,
        label: titleOf(collection, doc, reference),
        detail: collection.translated.map((field) => field.name).join(' · '),
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
