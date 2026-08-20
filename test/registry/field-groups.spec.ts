import { describe, expect, it } from 'vitest'
import { COLLECTIONS } from '@/registry/collections'
import { fieldGroups } from '@/utils/field-groups'

function names(key: string, group: string): string[] {
  const found = fieldGroups(COLLECTIONS[key]).find((entry) => entry.title === group)
  return found ? found.entries.map((entry) => entry.field.name) : []
}

describe('field grouping follows the reading order, not the storage shape', () => {
  it('leads an experience with the role, then the employer, dates and place', () => {
    expect(names('experience', 'Details')).toEqual([
      'role',
      'company',
      'startDate',
      'endDate',
      'country',
      'city',
      'bullets',
      'tags',
      'link',
    ])
  })

  it('puts supporting metadata after the substance it describes', () => {
    const details = names('experience', 'Details')

    expect(details.indexOf('bullets')).toBeLessThan(details.indexOf('tags'))
    expect(details.indexOf('tags')).toBeLessThan(details.indexOf('link'))
  })

  it('never separates a translated field into a block of its own', () => {
    for (const collection of Object.values(COLLECTIONS)) {
      const titles = fieldGroups(collection).map((group) => group.title)
      expect(titles).not.toContain('Translations')
      expect(titles).not.toContain('Shared fields')
    }
  })

  it('keeps a translated field beside the shared fields of the same subject', () => {
    expect(names('person', 'Identity')).toEqual([
      'givenName',
      'familyName',
      'headline',
      'affiliation',
    ])
  })

  it('opens the hero with what is read first and ends on the chips', () => {
    expect(names('profile', 'Hero')).toEqual(['subtitles', 'tagline'])
  })

  it('gathers every uploaded file into a single trailing group', () => {
    const groups = fieldGroups(COLLECTIONS.person)

    expect(groups[groups.length - 1].title).toBe('Files')
    expect(groups[groups.length - 1].assets).toBe(true)
    expect(names('person', 'Files')).toEqual(['photo', 'resumes'])
  })

  it('orders a certification by title, issuer, date, then the decorative icon', () => {
    expect(names('certification', 'Details')).toEqual(['title', 'issuer', 'date', 'icon'])
  })

  it('stretches a lone field so a row never ends in a hole', () => {
    const details = fieldGroups(COLLECTIONS.volunteering).find((g) => g.title === 'Details')
    const byName = new Map(details!.entries.map((entry) => [entry.field.name, entry]))

    expect(byName.get('link')!.full).toBe(true)
    expect(byName.get('role')!.full).toBe(false)
    expect(byName.get('org')!.full).toBe(false)
  })

  it('leaves an even run of short fields side by side', () => {
    const details = fieldGroups(COLLECTIONS.experience).find((g) => g.title === 'Details')
    const byName = new Map(details!.entries.map((entry) => [entry.field.name, entry]))

    expect(byName.get('role')!.full).toBe(false)
    expect(byName.get('company')!.full).toBe(false)
    expect(byName.get('country')!.full).toBe(false)
    expect(byName.get('city')!.full).toBe(false)
  })

  it('loses no field on the way through', () => {
    for (const collection of Object.values(COLLECTIONS)) {
      const flattened = fieldGroups(collection).flatMap((group) =>
        group.entries.map((entry) => entry.field.name),
      )
      const expected = [...collection.fields, ...collection.translated]
        .filter((field) => !field.hidden)
        .map((field) => field.name)

      expect(flattened.slice().sort()).toEqual(expected.slice().sort())
    }
  })
})
