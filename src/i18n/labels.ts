import { i18n } from '@/i18n'
import { fieldLabel as derivedFieldLabel } from '@/registry/collections'
import type { CollectionDef, FieldDef } from '@/registry/collections'

function translate(key: string, fallback: string): string {
  const { t, te } = i18n.global
  return te(key) ? t(key) : fallback
}

export function collectionLabel(collection: CollectionDef): string {
  return translate(`collections.${collection.key}.label`, collection.label)
}

export function collectionSingular(collection: CollectionDef): string {
  return translate(`collections.${collection.key}.singular`, collection.singular)
}

export function navGroupLabel(label: string): string {
  return translate(`navGroups.${label}`, label)
}

export function screenLabel(key: string, fallback: string): string {
  return translate(`screens.${key}`, fallback)
}

export function fieldLabel(field: FieldDef): string {
  return translate(`fieldLabels.${field.name}`, derivedFieldLabel(field))
}

export function collectionBlurb(collection: CollectionDef, fallback: string): string {
  return translate(`collections.${collection.key}.blurb`, fallback)
}

export function statusLabel(status: string): string {
  return translate(`status.${status}`, status)
}
