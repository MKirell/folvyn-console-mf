import { fieldLabel, type CollectionDef, type FieldDef } from '@/registry/collections'
import type { AdminDocument, FieldValue, TranslationEntry } from '@/types/admin'

const LIST_TYPES = new Set(['tags', 'string-list', 'asset-list'])

export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

export function emptyValue(field: FieldDef): FieldValue | Record<string, string> {
  if (LIST_TYPES.has(field.type)) return []
  if (field.type === 'boolean') return false
  if (field.type === 'number') return field.min ?? 0
  if (field.type === 'asset-map') return {} as Record<string, string>
  return ''
}

export function blankTranslation(collection: CollectionDef): TranslationEntry {
  const entry: TranslationEntry = {}
  for (const field of collection.translated) {
    entry[field.name] = emptyValue(field) as FieldValue
  }
  return entry
}

export function blankDocument(collection: CollectionDef, langs: string[]): AdminDocument {
  const draft: AdminDocument = { id: '' }

  for (const field of collection.fields) {
    draft[field.name] = emptyValue(field)
  }

  if (collection.i18n) {
    const translations: Record<string, TranslationEntry> = {}
    for (const lang of langs) translations[lang] = blankTranslation(collection)
    draft.translations = translations
  }

  return draft
}

export function translationOf(doc: AdminDocument, lang: string): TranslationEntry | undefined {
  return doc.translations?.[lang]
}

export function copyOf(collection: CollectionDef, doc: AdminDocument): AdminDocument {
  const key = collection.titleField
  if (!key) return doc

  const suffix = (value: FieldValue): FieldValue =>
    typeof value === 'string' && value.trim().length > 0 ? `${value} (copy)` : value

  const translated = collection.translated.some((field) => field.name === key)
  if (!translated) return { ...doc, [key]: suffix(doc[key] as FieldValue) }

  const translations = doc.translations
  if (!translations) return doc

  const next: Record<string, TranslationEntry> = {}
  for (const [lang, values] of Object.entries(translations)) {
    next[lang] = { ...values, [key]: suffix(values?.[key]) }
  }

  return { ...doc, translations: next }
}

export function titleOf(collection: CollectionDef, doc: AdminDocument, lang: string): string {
  const key = collection.titleField
  if (!key) return doc.id

  const translated = collection.translated.some((field) => field.name === key)
  const raw = translated ? translationOf(doc, lang)?.[key] : doc[key]
  const isCode = [...collection.fields, ...collection.translated].some(
    (field) => field.name === key && (field.type === 'language' || field.type === 'flag'),
  )

  if (typeof raw === 'string' && raw.trim().length > 0) {
    if (collection.titleFormat === 'languageName') return languageName(raw)
    return isCode ? raw.toUpperCase() : raw
  }
  if (typeof raw === 'number') return String(raw)

  const fallbackLang = Object.keys(doc.translations ?? {})[0]
  if (translated && fallbackLang) {
    const fallback = translationOf(doc, fallbackLang)?.[key]
    if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback
  }

  return 'Untitled'
}

export function subtitleOf(collection: CollectionDef, doc: AdminDocument, lang: string): string {
  const key = collection.subtitleField
  if (!key) return ''

  const field = [...collection.fields, ...collection.translated].find((entry) => entry.name === key)
  const raw =
    field && collection.translated.includes(field) ? translationOf(doc, lang)?.[key] : doc[key]
  if (typeof raw !== 'string' && typeof raw !== 'number') return ''

  return String(raw)
}

export function monthLabel(value: string, locale: string): string {
  const [year, month] = value.split('-').map(Number)
  if (!year || !month) return value

  try {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      new Date(Date.UTC(year, month - 1, 1)),
    )
  } catch {
    return value
  }
}

export function fieldTypeOf(collection: CollectionDef, name: string): string {
  const field = [...collection.fields, ...collection.translated].find(
    (entry) => entry.name === name,
  )
  return field?.type ?? ''
}

export function optionKeyOf(collection: CollectionDef, name: string): string {
  const field = [...collection.fields, ...collection.translated].find(
    (entry) => entry.name === name,
  )
  return field?.optionsKey ?? ''
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function isTranslationComplete(
  collection: CollectionDef,
  doc: AdminDocument,
  lang: string,
): boolean {
  const entry = translationOf(doc, lang)
  if (!entry) return false
  return collection.translated.every((field) => !field.required || !isBlank(entry[field.name]))
}

export function hasTranslation(doc: AdminDocument, lang: string): boolean {
  return translationOf(doc, lang) !== undefined
}

export function payloadFrom(
  collection: CollectionDef,
  draft: AdminDocument,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  for (const field of collection.fields) {
    const value = draft[field.name]
    if (value === undefined) continue
    if (!field.required && typeof value === 'string' && value.trim().length === 0) continue
    payload[field.name] = typeof value === 'string' ? value.trim() : value
  }

  if (collection.i18n && draft.translations) {
    const translations: Record<string, TranslationEntry> = {}

    for (const [lang, entry] of Object.entries(draft.translations)) {
      const cleaned: TranslationEntry = {}
      let filled = false

      for (const field of collection.translated) {
        const value = entry?.[field.name]
        if (value === undefined) continue
        if (!field.required && isBlank(value)) continue
        cleaned[field.name] = typeof value === 'string' ? value.trim() : value
        if (!isBlank(value)) filled = true
      }

      if (filled) translations[lang] = cleaned
    }

    payload.translations = translations
  }

  return payload
}

const URL_PATTERN = /^https?:\/\/[^\s]+$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateField(field: FieldDef, value: unknown): string | null {
  const label = fieldLabel(field)

  if (isBlank(value)) {
    return field.required ? `${label} is required` : null
  }

  if (typeof value === 'string') {
    if (field.maxLength && value.length > field.maxLength) {
      return `${label} must be at most ${field.maxLength} characters`
    }
    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      return `${label} has an invalid format`
    }
    if (field.type === 'email' && !EMAIL_PATTERN.test(value)) {
      return `${label} must be an email address`
    }
    if (field.type === 'url') {
      if (!URL_PATTERN.test(value)) return `${label} must be an absolute http(s) URL`
      if (field.protocol === 'https' && !value.toLowerCase().startsWith('https://')) {
        return `${label} must use https`
      }
    }
  }

  if (typeof value === 'number') {
    if (field.min !== undefined && value < field.min)
      return `${label} must be at least ${field.min}`
    if (field.max !== undefined && value > field.max) return `${label} must be at most ${field.max}`
    if (!Number.isInteger(value)) return `${label} must be a whole number`
  }

  if (Array.isArray(value)) {
    if (field.maxItems && value.length > field.maxItems) {
      return `${label} allows at most ${field.maxItems} entries`
    }
    if (field.itemMaxLength) {
      const tooLong = value.find(
        (item) => typeof item === 'string' && item.length > field.itemMaxLength!,
      )
      if (tooLong !== undefined) {
        return `Each ${label.toLowerCase()} entry must be at most ${field.itemMaxLength} characters`
      }
    }
  }

  return null
}

export interface ValidationResult {
  fields: Record<string, string>
  translations: Record<string, Record<string, string>>
  ok: boolean
}

export function validateDraft(
  collection: CollectionDef,
  draft: AdminDocument,
  langs: string[],
): ValidationResult {
  const fields: Record<string, string> = {}
  const translations: Record<string, Record<string, string>> = {}

  for (const field of collection.fields) {
    const message = validateField(field, draft[field.name])
    if (message) fields[field.name] = message
  }

  if (collection.i18n) {
    const entries = draft.translations ?? {}
    const filledLangs = langs.filter((lang) => {
      const entry = entries[lang]
      return entry !== undefined && Object.values(entry).some((value) => !isBlank(value))
    })

    if (filledLangs.length === 0) {
      fields.translations = 'At least one language must be filled in'
    }

    for (const lang of filledLangs) {
      const entryErrors: Record<string, string> = {}
      for (const field of collection.translated) {
        const message = validateField(field, entries[lang]?.[field.name])
        if (message) entryErrors[field.name] = message
      }
      if (Object.keys(entryErrors).length > 0) translations[lang] = entryErrors
    }
  }

  return {
    fields,
    translations,
    ok: Object.keys(fields).length === 0 && Object.keys(translations).length === 0,
  }
}

export function mapServerErrors(
  collection: CollectionDef,
  messages: readonly string[],
): Record<string, string> {
  const known = new Set([
    ...collection.fields.map((field) => field.name),
    ...collection.translated.map((field) => field.name),
    'translations',
  ])
  const mapped: Record<string, string> = {}

  for (const message of messages) {
    const field = message.split(' ')[0]?.split('.').pop() ?? ''
    if (known.has(field) && !mapped[field]) mapped[field] = message
  }

  return mapped
}

export function assetKeysOf(collection: CollectionDef, doc: AdminDocument): string[] {
  const keys: string[] = []

  for (const field of collection.fields) {
    const value = doc[field.name]
    if (field.type === 'asset' && typeof value === 'string' && value) keys.push(value)
    if (field.type === 'asset-list' && Array.isArray(value)) {
      keys.push(
        ...value.filter((item): item is string => typeof item === 'string' && item.length > 0),
      )
    }
    if (field.type === 'asset-map' && value && typeof value === 'object') {
      keys.push(...Object.values(value as Record<string, string>).filter(Boolean))
    }
  }

  return keys
}
