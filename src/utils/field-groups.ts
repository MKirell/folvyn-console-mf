import type { CollectionDef, FieldDef } from '@/registry/collections'

export interface FieldEntry {
  field: FieldDef
  translated: boolean
  full: boolean
}

export interface FieldGroup {
  title: string
  entries: FieldEntry[]
  assets: boolean
}

const FLOW = [
  'Identity',
  'Hero',
  'About',
  'Career',
  'Education',
  'Details',
  'Contact',
  'Location',
  'Files',
]

const RANK: Record<string, number> = {
  title: 10,
  role: 10,
  name: 10,
  code: 10,
  givenName: 11,
  familyName: 12,
  headline: 13,
  company: 20,
  issuer: 20,
  school: 20,
  org: 20,
  place: 21,
  affiliation: 22,
  level: 23,
  badge: 24,
  label: 25,
  current: 30,
  startDate: 31,
  endDate: 32,
  date: 33,
  period: 34,
  country: 40,
  location: 41,
  city: 41,
  flagCode: 42,
  subtitles: 50,
  tagline: 51,
  desc: 52,
  bullets: 52,
  aboutParagraphs: 52,
  honors: 53,
  tags: 60,
  accentTags: 61,
  icon: 65,
  enabled: 64,
  link: 70,
  email: 71,
  phone: 72,
  linkedin: 73,
  github: 74,
}

const UNRANKED = 45
const ASSET_GROUP = 'Files'
const FALLBACK_GROUP = 'Details'

function isAsset(field: FieldDef): boolean {
  return field.type.startsWith('asset')
}

function groupOf(entry: FieldEntry): string {
  if (isAsset(entry.field)) return ASSET_GROUP
  return entry.field.group ?? FALLBACK_GROUP
}

function flowRank(title: string): number {
  const index = FLOW.indexOf(title)
  return index === -1 ? FLOW.length : index
}

export function fieldGroups(collection: CollectionDef): FieldGroup[] {
  const entries: FieldEntry[] = [
    ...collection.fields.map((field) => ({ field, translated: false, full: false })),
    ...collection.translated.map((field) => ({ field, translated: true, full: false })),
  ].filter((entry) => !entry.field.hidden)

  const declared = new Map(entries.map((entry, index) => [entry.field.name, index]))
  const buckets = new Map<string, FieldEntry[]>()

  for (const entry of entries) {
    const title = groupOf(entry)
    buckets.set(title, [...(buckets.get(title) ?? []), entry])
  }

  const weigh = (entry: FieldEntry): number => RANK[entry.field.name] ?? UNRANKED

  return [...buckets.entries()]
    .map(([title, list]) => ({
      title,
      assets: title === ASSET_GROUP,
      entries: pack(
        [...list].sort(
          (a, b) =>
            weigh(a) - weigh(b) ||
            (declared.get(a.field.name) ?? 0) - (declared.get(b.field.name) ?? 0),
        ),
      ),
    }))
    .sort((a, b) => flowRank(a.title) - flowRank(b.title) || a.title.localeCompare(b.title))
}

function pack(entries: FieldEntry[]): FieldEntry[] {
  const packed = entries.map((entry) => ({ ...entry, full: Boolean(entry.field.wide) }))

  let run = 0
  for (let index = 0; index <= packed.length; index += 1) {
    const entry = packed[index]

    if (entry && !entry.full) {
      run += 1
      continue
    }

    if (run % 2 === 1) packed[index - 1].full = true
    run = 0
  }

  return packed
}

export function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}
