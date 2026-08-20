import { describe, expect, it } from 'vitest'
import { useContentStore } from '@/stores/content'
import { localeProgress } from '@/utils/locale-queue'
import { COLLECTIONS } from '@/registry/collections'
import { isTranslationComplete, hasTranslation, titleOf } from '@/utils/entity'
import { certifications, experiences, locales, person, profile } from '../setup'

function seed() {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    experience: experiences.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
  }
  content.singletons = { person: { ...person }, profile: { ...profile } }
  return content
}

describe('translation completeness', () => {
  it('treats a present entry with every required field as complete', () => {
    expect(isTranslationComplete(COLLECTIONS.experience, experiences[0], 'en')).toBe(true)
  })

  it('treats a missing entry as incomplete', () => {
    const doc = { ...experiences[0], translations: { en: experiences[0].translations!.en } }
    expect(isTranslationComplete(COLLECTIONS.experience, doc, 'fr')).toBe(false)
    expect(hasTranslation(doc, 'fr')).toBe(false)
  })

  it('treats a present but blank required field as incomplete', () => {
    const doc = { ...experiences[0], translations: { en: { role: '  ', bullets: [] } } }
    expect(isTranslationComplete(COLLECTIONS.experience, doc, 'en')).toBe(false)
  })

  it('reads a shared title field regardless of the editing locale', () => {
    expect(titleOf(COLLECTIONS.certification, certifications[1], 'fr')).toBe('DP-900')
  })

  it('falls back to another locale when the translated title is missing', () => {
    const doc = {
      id: 's1',
      order: 0,
      code: 'fr',
      country: 'FR',
      level: 'c1',
      pct: 90,
    }
    expect(titleOf(COLLECTIONS.spokenLanguage, doc, 'nl')).toBe('French')
  })
})

describe('locale work queue', () => {
  it('front-loads the translated singletons, derived from the registry', () => {
    const progress = localeProgress(seed(), 'fr')
    expect(progress.groups[0].key).toBe('foundation')
    expect(progress.groups[0].tasks.map((task) => task.key)).toEqual(['person', 'profile'])
  })

  it('marks the UI strings step done only when a document exists', () => {
    const content = seed()
    expect(localeProgress(content, 'en').groups[0].tasks[1].done).toBe(true)
    expect(localeProgress(content, 'fr').groups[0].tasks[1].done).toBe(false)
  })

  it('counts every entry missing a complete translation', () => {
    const progress = localeProgress(seed(), 'fr')
    const jobs = progress.groups.find((group) => group.key === 'experience')

    expect(jobs?.tasks).toHaveLength(1)
    expect(jobs?.tasks.map((task) => task.done)).toEqual([true])
  })

  it('leaves a collection with nothing to translate out of the queue', () => {
    const progress = localeProgress(seed(), 'fr')

    expect(progress.groups.map((group) => group.key)).not.toContain('certification')
  })

  it('computes a percentage across every task', () => {
    const english = localeProgress(seed(), 'en')
    expect(english.percent).toBe(100)

    const french = localeProgress(seed(), 'fr')
    expect(french.done).toBe(1)
    expect(french.percent).toBe(33)

    const dutch = localeProgress(seed(), 'nl')
    expect(dutch.done).toBe(0)
    expect(dutch.percent).toBe(0)
  })
})
