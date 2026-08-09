import { beforeEach, describe, expect, it } from 'vitest'
import { incompleteLocaleReason } from '@/utils/locale-queue'
import { useContentStore } from '@/stores/content'
import { certifications, experiences, locales, person, profile } from './setup'

function seed(): ReturnType<typeof useContentStore> {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    experience: experiences.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
  }
  content.singletons = { person: { ...person }, profile: { ...profile } }
  content.loaded = true
  return content
}

describe('enabling a locale', () => {
  let content: ReturnType<typeof useContentStore>

  beforeEach(() => {
    content = seed()
  })

  it('is refused while any translation is missing', () => {
    const reason = incompleteLocaleReason(content, 'fr')

    expect(reason).toBeTruthy()
    expect(reason).toMatch(/% translated/)
  })

  it('names what is left to translate, not just a number', () => {
    const reason = incompleteLocaleReason(content, 'fr') ?? ''

    expect(reason).toMatch(/finish \S/)
  })

  it('refuses a locale nobody has started', () => {
    expect(incompleteLocaleReason(content, 'nl')).toBeTruthy()
  })

  it('allows the locale every document already carries', () => {
    expect(incompleteLocaleReason(content, 'en')).toBeNull()
  })
})
