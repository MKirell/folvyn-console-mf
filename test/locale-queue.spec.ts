import { describe, expect, it } from 'vitest'
import { useContentStore } from '@/stores/content'
import { localeProgress } from '@/utils/locale-queue'
import { COLLECTIONS } from '@/registry/collections'
import { isTranslationComplete, hasTranslation, titleOf } from '@/utils/entity'
import { certifications, locales, profile } from './setup'

function seed() {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
  }
  content.singletons = { profile: { ...profile } }
  return content
}

describe('translation completeness', () => {
  it('treats a present entry with every required field as complete', () => {
    expect(isTranslationComplete(COLLECTIONS.certification, certifications[0], 'en')).toBe(true)
  })

  it('treats a missing entry as incomplete', () => {
    expect(isTranslationComplete(COLLECTIONS.certification, certifications[1], 'fr')).toBe(false)
    expect(hasTranslation(certifications[1], 'fr')).toBe(false)
  })

  it('treats a present but blank required field as incomplete', () => {
    const doc = { ...certifications[0], translations: { en: { date: '  ' } } }
    expect(isTranslationComplete(COLLECTIONS.certification, doc, 'en')).toBe(false)
  })

  it('reads a shared title field regardless of the editing locale', () => {
    expect(titleOf(COLLECTIONS.certification, certifications[1], 'fr')).toBe('DP-900')
  })

  it('falls back to another locale when the translated title is missing', () => {
    const doc = {
      id: 's1',
      order: 0,
      flagCode: 'fr',
      pct: 90,
      translations: { en: { name: 'French', level: 'Fluent' } },
    }
    expect(titleOf(COLLECTIONS.spokenLanguage, doc, 'nl')).toBe('French')
  })
})

describe('locale work queue', () => {
  it('front-loads the locale row and the hero narrative', () => {
    const progress = localeProgress(seed(), 'fr')
    expect(progress.groups[0].key).toBe('foundation')
    expect(progress.groups[0].tasks.map((task) => task.key)).toEqual(['locale-row', 'profile'])
  })

  it('marks the UI strings step done only when a document exists', () => {
    const content = seed()
    expect(localeProgress(content, 'en').groups[0].tasks[1].done).toBe(true)
    expect(localeProgress(content, 'fr').groups[0].tasks[1].done).toBe(false)
  })

  it('counts every entry missing a complete translation', () => {
    const progress = localeProgress(seed(), 'fr')
    const certs = progress.groups.find((group) => group.key === 'certification')

    expect(certs?.tasks).toHaveLength(2)
    expect(certs?.tasks.map((task) => task.done)).toEqual([true, false])
  })

  it('computes a percentage across every task', () => {
    const english = localeProgress(seed(), 'en')
    expect(english.percent).toBe(100)

    const dutch = localeProgress(seed(), 'nl')
    expect(dutch.done).toBe(1)
    expect(dutch.percent).toBe(25)
  })
})
