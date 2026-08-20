import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COLLECTIONS } from '@/registry/collections'
import { useContentStore } from '@/stores/content'
import * as api from '@/services/admin.api'
import { certifications, locales, person, profile } from '../setup'

const certification = COLLECTIONS.certification

function seed() {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
  }
  content.singletons = { person: { ...person }, profile: { ...profile } }
  content.loaded = true
  return content
}

beforeEach(() => {
  vi.mocked(api.listDocuments).mockResolvedValue([])
  vi.mocked(api.fetchLocales).mockResolvedValue(locales)
  vi.mocked(api.reorderDocuments).mockResolvedValue([])
  vi.mocked(api.deleteDocument).mockResolvedValue(undefined)
})

describe('reading the content store', () => {
  it('lists a collection it holds, and nothing for one it does not', () => {
    const content = seed()

    expect(content.list('certification')).toHaveLength(certifications.length)
    expect(content.list('nothing-like-this')).toEqual([])
  })

  it('finds one entry by id, and reports a miss rather than guessing', () => {
    const content = seed()

    expect(content.find('certification', certifications[0].id)?.id).toBe(certifications[0].id)
    expect(content.find('certification', 'no-such-id')).toBeUndefined()
  })

  it('reads a singleton it holds, and null for one it does not', () => {
    const content = seed()

    expect(content.singleton('person')).not.toBeNull()
    expect(content.singleton('nothing-like-this')).toBeNull()
  })

  it('takes the reference language from the first locale, and falls back when there are none', () => {
    const content = seed()
    expect(content.referenceLang).toBe(locales[0].code)

    content.documents = { locale: [] }
    expect(content.referenceLang).toBe('en')
  })

  it('counts only the locales that are switched on', () => {
    const content = seed()
    const before = content.enabledLocales.length

    content.documents = {
      locale: locales.map((locale, index) => ({ ...locale, enabled: index === 0 })),
    }

    expect(content.enabledLocales).toHaveLength(1)
    expect(before).toBeGreaterThan(1)
  })

  it('counts every collection it is holding', () => {
    const content = seed()

    expect(content.counts.certification).toBe(certifications.length)
  })
})

describe('loading', () => {
  it('loads once and does not ask again until forced', async () => {
    const content = useContentStore()

    await content.loadAll()
    const first = vi.mocked(api.listDocuments).mock.calls.length
    expect(first).toBeGreaterThan(0)

    await content.loadAll()
    expect(vi.mocked(api.listDocuments).mock.calls.length).toBe(first)

    await content.loadAll(true)
    expect(vi.mocked(api.listDocuments).mock.calls.length).toBeGreaterThan(first)
  })

  it('reports failure rather than pretending it loaded nothing', async () => {
    vi.mocked(api.listDocuments).mockRejectedValue(new Error('offline'))
    const content = useContentStore()

    await content.loadAll(true)

    expect(content.failed).toBe(true)
    expect(content.error).not.toBeNull()
  })

  it('is not failed once a later load succeeds', async () => {
    vi.mocked(api.listDocuments).mockRejectedValueOnce(new Error('offline'))
    const content = useContentStore()

    await content.loadAll(true)
    vi.mocked(api.listDocuments).mockResolvedValue([])
    await content.loadAll(true)

    expect(content.failed).toBe(false)
  })
})

describe('writing through the store', () => {
  it('puts a new entry at the head and renumbers the rest', async () => {
    const content = seed()
    vi.mocked(api.createDocument).mockResolvedValue({ id: 'new-1', order: 0, title: 'New' })

    await content.create(certification, { title: 'New' } as never)

    expect(content.list('certification')[0].id).toBe('new-1')
    expect(content.list('certification').map((row) => row.order)).toEqual(
      content.list('certification').map((_, index) => index),
    )
  })

  it('keeps the list as the API returned it when an update succeeds', async () => {
    const content = seed()
    const target = certifications[0]
    vi.mocked(api.updateDocument).mockResolvedValue({ ...target, title: 'Renamed' })

    await content.update(certification, target.id, { title: 'Renamed' } as never)

    expect(content.find('certification', target.id)?.title).toBe('Renamed')
  })

  it('saves a singleton and keeps what the API echoed back', async () => {
    const content = seed()
    vi.mocked(api.updateSingleton).mockResolvedValue({ ...person, city: 'Berlin' })

    await content.saveSingleton(COLLECTIONS.person, { city: 'Berlin' } as never)

    expect(content.singleton('person')?.city).toBe('Berlin')
  })

  it('removes an entry and leaves the order contiguous', async () => {
    const content = seed()
    const target = certifications[0]

    await content.remove(certification, target.id)

    expect(content.find('certification', target.id)).toBeUndefined()
    expect(content.list('certification').map((row) => row.order)).toEqual(
      content.list('certification').map((_, index) => index),
    )
  })
})
