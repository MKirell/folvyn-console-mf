import { assetPrefix } from '@/utils/assets'
import type { CollectionDef } from '@/registry/collections'
import type { AdminDocument } from '@/types/admin'

const COLLECTION_TO_PAYLOAD: Record<string, string> = {
  experience: 'experiences',
  project: 'projects',
  skillCategory: 'skillCategories',
  degree: 'degrees',
  certification: 'certifications',
  spokenLanguage: 'spokenLanguages',
  volunteering: 'volunteering',
  award: 'awards',
}

const PREVIEWABLE = new Set([...Object.keys(COLLECTION_TO_PAYLOAD), 'person', 'profile'])

export function hasPreview(collectionKey: string): boolean {
  return PREVIEWABLE.has(collectionKey)
}

const EDUCATION_KEYS = ['degrees', 'certifications', 'spokenLanguages']
const ACHIEVEMENT_KEYS = ['volunteering', 'awards']

export interface PreviewContext {
  locales: { code: string; flagCode: string; label?: string }[]
  person: AdminDocument | null
  profile: AdminDocument | null
  lists: Record<string, AdminDocument[]>
}

function flatten(document: AdminDocument, lang: string): Record<string, unknown> {
  const { translations, ...rest } = document
  return { ...rest, ...((translations?.[lang] as Record<string, unknown>) ?? {}) }
}

function withDraft(
  entries: AdminDocument[],
  draft: AdminDocument,
  belongs: boolean,
): AdminDocument[] {
  if (!belongs) return entries
  return entries.some((entry) => entry.id === draft.id)
    ? entries.map((entry) => (entry.id === draft.id ? draft : entry))
    : [...entries, draft]
}

export function buildPreviewPayload(
  collection: CollectionDef,
  document: AdminDocument,
  lang: string,
  context: PreviewContext,
): Record<string, unknown> {
  const education: Record<string, unknown[]> = {}
  const achievements: Record<string, unknown[]> = {}
  const payload: Record<string, unknown> = {
    lang,
    assetPrefix: assetPrefix(),
    availableLangs: context.locales,
    person: context.person ? flatten(context.person, lang) : {},
    profile: context.profile
      ? flatten(context.profile, lang)
      : { subtitles: [], tagline: '', highlights: [], aboutParagraphs: [], contactDesc: '' },
    experiences: [],
    projects: [],
    skillCategories: [],
    education,
    achievements,
  }

  for (const [key, target] of Object.entries(COLLECTION_TO_PAYLOAD)) {
    const entries = withDraft(context.lists[key] ?? [], document, collection.key === key).map(
      (entry) => flatten(entry, lang),
    )

    if (EDUCATION_KEYS.includes(target)) education[target] = entries
    else if (ACHIEVEMENT_KEYS.includes(target)) achievements[target] = entries
    else payload[target] = entries
  }

  if (collection.key === 'person') payload.person = flatten(document, lang)
  if (collection.key === 'profile') payload.profile = flatten(document, lang)

  return payload
}
