import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FunnelRows from '@/components/charts/FunnelRows.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import BarRows from '@/components/charts/BarRows.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import {
  KEY_PATTERN,
  contentTypeOf,
  formatBytes,
  isImageKey,
  sanitizeFilename,
} from '@/utils/assets'
import { changedFields, clone, deepEqual, writableKeys } from '@/utils/diff'
import { flatten, getPath, setPath } from '@/utils/path'
import { assetKeysOf, copyOf, mapServerErrors } from '@/utils/entity'
import { COLLECTIONS } from '@/registry/collections'

describe('asset keys', () => {
  it('accepts every filename the database already stores', () => {
    for (const key of [
      'degree-bachelor-2024.pdf',
      'resume_en_ada-lovelace.pdf',
      'off-image.jpeg',
      'folvyn-logo-dark.png',
      'award-awa-2023-1.jpg',
      'flags/tn.svg',
    ]) {
      expect(KEY_PATTERN.test(key), key).toBe(true)
    }
  })

  it('rejects traversal and uppercase keys', () => {
    for (const key of ['../secret.pdf', 'a/b/c.pdf', 'Resume.PDF', 'no-extension']) {
      expect(KEY_PATTERN.test(key), key).toBe(false)
    }
  })

  it('sanitizes a filename into a legal key', () => {
    expect(sanitizeFilename('Certificat Français 2024.PDF')).toBe('certificat-francais-2024.pdf')
    expect(sanitizeFilename('  spaced   name.png')).toBe('spaced-name.png')
  })

  it('maps extensions to the allowlisted content types', () => {
    expect(contentTypeOf('a.pdf')).toBe('application/pdf')
    expect(contentTypeOf('a.jpeg')).toBe('image/jpeg')
    expect(contentTypeOf('a.svg')).toBe('image/svg+xml')
    expect(contentTypeOf('a.exe')).toBeUndefined()
  })

  it('classifies images by extension', () => {
    expect(isImageKey('x.jpg')).toBe(true)
    expect(isImageKey('x.pdf')).toBe(false)
  })

  it('formats sizes for the media grid', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 kB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })

  it('collects every image an award points at', () => {
    const keys = assetKeysOf(COLLECTIONS.award, {
      id: 'a1',
      icon: 'Trophy',
      flagCode: 'tn',
      images: ['one.jpg', 'two.jpg'],
    })

    expect(keys).toEqual(['one.jpg', 'two.jpg'])
  })

  it('ignores a document on an award, which carries none', () => {
    const keys = assetKeysOf(COLLECTIONS.award, {
      id: 'a1',
      icon: 'Trophy',
      images: ['one.jpg'],
      doc: 'attestation.pdf',
    })

    expect(keys).toEqual(['one.jpg'])
  })

  it('collects the document a certification points at', () => {
    const keys = assetKeysOf(COLLECTIONS.certification, {
      id: 'c1',
      icon: 'Award',
      doc: 'certificate-azure-ai900.pdf',
    })

    expect(keys).toEqual(['certificate-azure-ai900.pdf'])
  })
})

describe('duplicating', () => {
  it('marks a shared title field as a copy', () => {
    const copy = copyOf(COLLECTIONS.certification, { id: 'c1', order: 0, title: 'AI-900' })

    expect(copy.title).toBe('AI-900 (copy)')
  })

  it('marks a project title in every locale, now that a project name is translated', () => {
    const copy = copyOf(COLLECTIONS.project, {
      id: 'p1',
      order: 0,
      translations: {
        en: { title: 'Retail recommender', desc: 'A thing' },
        fr: { title: 'Moteur de recommandation', desc: 'Un truc' },
      },
    })

    expect(copy.translations?.en.title).toBe('Retail recommender (copy)')
    expect(copy.translations?.fr.title).toBe('Moteur de recommandation (copy)')
  })

  it('marks a translated title in every locale, which a shared-field-only rule missed', () => {
    const copy = copyOf(COLLECTIONS.experience, {
      id: 'e1',
      order: 0,
      company: 'Acme Corp',
      translations: {
        en: { role: 'Backend Engineer', bullets: ['Built agents'] },
        fr: { role: 'Ingénieur backend', bullets: ['Développé des agents'] },
      },
    })

    expect(copy.translations?.en.role).toBe('Backend Engineer (copy)')
    expect(copy.translations?.fr.role).toBe('Ingénieur backend (copy)')
    expect(copy.translations?.en.bullets).toEqual(['Built agents'])
    expect(copy.company).toBe('Acme Corp')
  })

  it('leaves an empty title alone rather than producing " (copy)"', () => {
    const copy = copyOf(COLLECTIONS.certification, { id: 'c1', order: 0, title: '' })

    expect(copy.title).toBe('')
  })

  it('leaves a document without the title field untouched', () => {
    const copy = copyOf(COLLECTIONS.experience, { id: 'e1', order: 0, company: 'Acme' })

    expect(copy.company).toBe('Acme')
  })
})

describe('diffing', () => {
  it('compares nested structures by value', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true)
    expect(deepEqual({ a: [1] }, { a: [1, 2] })).toBe(false)
  })

  it('returns only the keys that moved', () => {
    const before = { a: 1, b: 'x', c: ['t'] }
    const after = { a: 1, b: 'y', c: ['t'] }
    expect(changedFields(before, after, ['a', 'b', 'c'])).toEqual({ b: 'y' })
  })

  it('treats a null original as a full create payload', () => {
    expect(changedFields(null, { a: 1, b: 2 }, ['a', 'b'])).toEqual({ a: 1, b: 2 })
  })

  it('sends null for an optional field the payload builder dropped once cleared', () => {
    const before = { title: 'AI-900', doc: 'certificate.pdf' }
    const after = { title: 'AI-900' }

    expect(changedFields(before, after, writableKeys(before, after))).toEqual({ doc: null })
  })

  it('leaves a field alone when it was blank before and after', () => {
    const before = { title: 'AI-900' }
    const after = { title: 'AI-900' }

    expect(changedFields(before, after, writableKeys(before, after))).toEqual({})
  })

  it('never invents a null on a create', () => {
    expect(changedFields(null, { a: 1 }, writableKeys(null, { a: 1 }))).toEqual({ a: 1 })
  })

  it('clones an absent key without throwing, so building an undo cannot crash', () => {
    expect(() => clone(undefined)).not.toThrow()
    expect(clone(undefined)).toBeUndefined()
  })
})

describe('deep paths', () => {
  it('reads and writes without mutating the source', () => {
    const source = { hero: { cta: { primary: 'Hire me' } } }
    const next = setPath(source, 'hero.cta.primary', 'Contact')

    expect(getPath(next, 'hero.cta.primary')).toBe('Contact')
    expect(getPath(source, 'hero.cta.primary')).toBe('Hire me')
  })

  it('flattens a nested document into dotted keys', () => {
    expect(flatten({ shell: { messages: { ok: 'fine' } }, nav: { about: 'About' } })).toEqual({
      'shell.messages.ok': 'fine',
      'nav.about': 'About',
    })
  })
})

describe('server error mapping', () => {
  it('attaches a class-validator message to its field', () => {
    const mapped = mapServerErrors(COLLECTIONS.certification, [
      'title must be shorter than or equal to 200 characters',
      'nonsense message',
    ])
    expect(mapped.title).toMatch(/200 characters/)
    expect(Object.keys(mapped)).toHaveLength(1)
  })
})

describe('charts', () => {
  it('scales the funnel against sessions, not the first row', () => {
    const wrapper = mount(FunnelRows, {
      props: {
        rows: [
          { key: 'hero', count: 100 },
          { key: 'projects', count: 36 },
        ],
        sessions: 100,
      },
    })
    expect(wrapper.text()).toContain('100%')
    expect(wrapper.text()).toContain('36%')
    expect(wrapper.text()).toContain('−64%')
  })

  it('shows a thin-data message instead of a two-point chart', () => {
    const wrapper = mount(BarRows, { props: { rows: [], empty: 'Not enough data yet' } })
    expect(wrapper.text()).toContain('Not enough data yet')
  })

  it('renders one hover target per point', () => {
    const wrapper = mount(SparkLine, {
      props: {
        points: [
          { date: '01-01', value: 3 },
          { date: '01-02', value: 9 },
        ],
      },
    })
    expect(wrapper.findAll('rect')).toHaveLength(2)
    expect(wrapper.find('svg').attributes('aria-label')).toContain('peak 9')
  })

  it('states what is missing rather than showing an empty panel', () => {
    const wrapper = mount(EmptyState, { props: { title: 'No analytics yet', description: 'soon' } })
    expect(wrapper.text()).toContain('No analytics yet')
  })
})
