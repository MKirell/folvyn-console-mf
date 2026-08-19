import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldRenderer from '@/components/fields/FieldRenderer.vue'
import { COLLECTIONS, LIST_COLLECTIONS } from '@/registry/collections'
import { fieldLabel } from '@/i18n/labels'
import { blankDocument, payloadFrom, validateDraft } from '@/utils/entity'
import { changedFields } from '@/utils/diff'
import { certifications } from './setup'

const LANGS = ['en', 'fr']

describe('field registry', () => {
  it('renders every declared field for every collection', () => {
    for (const collection of Object.values(COLLECTIONS)) {
      const draft = blankDocument(collection, LANGS)

      for (const field of [...collection.fields, ...collection.translated]) {
        const wrapper = mount(FieldRenderer, {
          props: { field, modelValue: draft[field.name] },
        })
        expect(wrapper.text()).toContain(fieldLabel(field))
        wrapper.unmount()
      }
    }
  })

  it('gives every typed-in field a placeholder, so no field is a blank guess', () => {
    const NEEDS_PLACEHOLDER = ['text', 'textarea', 'url', 'email', 'tags', 'string-list']
    const missing: string[] = []

    for (const collection of Object.values(COLLECTIONS)) {
      for (const field of [...collection.fields, ...collection.translated]) {
        if (!NEEDS_PLACEHOLDER.includes(field.type)) continue
        if (!field.placeholder) missing.push(`${collection.key}.${field.name}`)
      }
    }

    expect(missing).toEqual([])
  })

  it('never promises a count the example does not show', () => {
    const wrong: string[] = []

    for (const collection of Object.values(COLLECTIONS)) {
      for (const field of [...collection.fields, ...collection.translated]) {
        const placeholder = field.placeholder
        if (!placeholder) continue

        const [description, example] = placeholder.split(' : ')
        const items = example.split(', ').length

        if (/^The one\b/.test(description) && items !== 1) {
          wrong.push(`${collection.key}.${field.name}`)
        }
        if (/per chip$/.test(description) && items < 2) {
          wrong.push(`${collection.key}.${field.name}`)
        }
      }
    }

    expect(wrong).toEqual([])
  })

  it('keeps every placeholder to one readable line', () => {
    const tooLong: string[] = []

    for (const collection of Object.values(COLLECTIONS)) {
      for (const field of [...collection.fields, ...collection.translated]) {
        if (field.placeholder && field.placeholder.length > 70) {
          tooLong.push(`${collection.key}.${field.name}`)
        }
      }
    }

    expect(tooLong).toEqual([])
  })

  it('writes every placeholder as a description then an example', () => {
    const malformed: string[] = []

    for (const collection of Object.values(COLLECTIONS)) {
      for (const field of [...collection.fields, ...collection.translated]) {
        if (!field.placeholder) continue
        if (!field.placeholder.includes(' : ')) malformed.push(`${collection.key}.${field.name}`)
      }
    }

    expect(malformed).toEqual([])
  })

  it('shows the placeholder and nothing else under the field', () => {
    const phone = COLLECTIONS.person.fields.find((field) => field.name === 'phone')!

    const wrapper = mount(FieldRenderer, { props: { field: phone, modelValue: '' } })
    expect(wrapper.find('input').attributes('placeholder')).toBe(phone.placeholder)
    expect(wrapper.findAll('p')).toHaveLength(0)
    wrapper.unmount()
  })

  it('keeps placeholders generic rather than echoing the owner’s own data', () => {
    const REAL_VALUES =
      /\b(mkirell|folvyn|zrelly|mohamed|khalil|cr[eé]dit agricole|enactus|aiesec|galil\w*|villetaneuse|ariana|ezzahra|tunis\w*|langgraph|langchain|qdrant|milvus|bedrock|streamlit|hult)\b/i
    const offenders: string[] = []

    for (const collection of Object.values(COLLECTIONS)) {
      for (const field of [...collection.fields, ...collection.translated]) {
        const text = field.placeholder ?? ''
        if (REAL_VALUES.test(text)) offenders.push(`${collection.key}.${field.name}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('caps the hero subtitles at four and the about paragraphs at three', () => {
    const subtitles = COLLECTIONS.profile.translated.find((field) => field.name === 'subtitles')
    const paragraphs = COLLECTIONS.person.translated.find(
      (field) => field.name === 'aboutParagraphs',
    )

    expect(subtitles?.maxItems).toBe(4)
    expect(paragraphs?.maxItems).toBe(3)
  })

  it('hides the add control on a capped string list once it is full', async () => {
    const field = COLLECTIONS.person.translated.find((entry) => entry.name === 'aboutParagraphs')!

    const room = mount(FieldRenderer, { props: { field, modelValue: ['one', 'two'] } })
    expect(room.text()).toContain('Add entry')
    room.unmount()

    const full = mount(FieldRenderer, { props: { field, modelValue: ['one', 'two', 'three'] } })
    expect(full.text()).not.toContain('Add entry')
    full.unmount()
  })

  it('lets a tag be moved earlier and later, so display order stays the author’s', async () => {
    const field = { name: 'tags', type: 'tags' as const }
    const wrapper = mount(FieldRenderer, { props: { field, modelValue: ['a', 'b', 'c'] } })

    await wrapper.find('[aria-label="Move c earlier"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0][0]).toEqual(['a', 'c', 'b'])

    await wrapper.find('[aria-label="Move a later"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[1][0]).toEqual(['b', 'a', 'c'])
    wrapper.unmount()
  })

  it('cannot move the first tag earlier or the last one later', () => {
    const field = { name: 'tags', type: 'tags' as const }
    const wrapper = mount(FieldRenderer, { props: { field, modelValue: ['a', 'b'] } })

    expect(wrapper.find('[aria-label="Move a earlier"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[aria-label="Move b later"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('hides the tag input once a capped tag list is full', () => {
    const field = { name: 'tags', type: 'tags' as const, maxItems: 2 }

    const room = mount(FieldRenderer, { props: { field, modelValue: ['a'] } })
    expect(room.find('input').exists()).toBe(true)
    room.unmount()

    const full = mount(FieldRenderer, { props: { field, modelValue: ['a', 'b'] } })
    expect(full.find('input').exists()).toBe(false)
    full.unmount()
  })

  it('picks a country from a select rather than a typed code, everywhere it appears', () => {
    const countryFields = Object.values(COLLECTIONS).flatMap((collection) =>
      [...collection.fields, ...collection.translated].filter((field) =>
        /country/i.test(field.name),
      ),
    )

    expect(countryFields.length).toBeGreaterThan(1)
    for (const field of countryFields) {
      expect(field.type).toBe('country')

      const wrapper = mount(FieldRenderer, { props: { field, modelValue: 'FR' } })
      expect(wrapper.find('select').exists()).toBe(true)
      wrapper.unmount()
    }
  })

  it('every list collection declares a title field it can resolve', () => {
    for (const collection of LIST_COLLECTIONS) {
      expect(collection.titleField).toBeTruthy()
      const known = [...collection.fields, ...collection.translated].map((field) => field.name)
      expect(known).toContain(collection.titleField)
    }
  })

  it('blocks a save when a required field is empty', () => {
    const collection = COLLECTIONS.certification
    const result = validateDraft(collection, blankDocument(collection, LANGS), LANGS)

    expect(result.ok).toBe(false)
    expect(result.fields.title).toMatch(/required/i)
    expect(result.fields.icon).toMatch(/required/i)
  })

  it('accepts a fully filled draft', () => {
    const collection = COLLECTIONS.certification
    const draft = {
      ...blankDocument(collection, LANGS),
      icon: 'Zap',
      title: 'AI-900',
      issuer: 'Microsoft',
      date: '2024-06',
    }

    expect(validateDraft(collection, draft, LANGS).ok).toBe(true)
  })

  it('reports a max length breach against the DTO limit', () => {
    const collection = COLLECTIONS.certification
    const draft = {
      ...blankDocument(collection, LANGS),
      icon: 'Zap',
      title: 'x'.repeat(121),
      issuer: 'Microsoft',
      translations: { en: { date: 'June 2024' } },
    }

    expect(validateDraft(collection, draft, LANGS).fields.title).toMatch(/120 characters/)
  })

  it('strips fields the API does not whitelist', () => {
    const collection = COLLECTIONS.certification
    const payload = payloadFrom(collection, {
      ...certifications[0],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
      rogue: 'should not be sent',
    })

    expect(Object.keys(payload).sort()).toEqual(['date', 'doc', 'icon', 'issuer', 'title'])
  })

  it('builds a PATCH payload containing only changed keys', () => {
    const collection = COLLECTIONS.certification
    const before = payloadFrom(collection, certifications[0])
    const after = payloadFrom(collection, { ...certifications[0], title: 'AI-900 renewed' })

    expect(changedFields(before, after, Object.keys(after))).toEqual({ title: 'AI-900 renewed' })
  })

  it('drops empty optional fields rather than sending empty strings', () => {
    const collection = COLLECTIONS.degree
    const payload = payloadFrom(collection, {
      id: 'd1',
      years: '2021 — 2024',
      doc: '',
      link: '',
      translations: { en: { title: 'Bachelor' } },
    })

    expect(payload).not.toHaveProperty('doc')
    expect(payload).not.toHaveProperty('link')
  })

  it('requires at least one filled translation', () => {
    const collection = COLLECTIONS.project
    const draft = {
      ...blankDocument(collection, LANGS),
      title: 'Console',
    }

    expect(validateDraft(collection, draft, LANGS).fields.translations).toMatch(/at least one/i)
  })
})
