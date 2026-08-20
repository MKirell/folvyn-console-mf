import { beforeEach, describe, expect, it, vi } from 'vitest'
import { COLLECTIONS } from '@/registry/collections'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import * as api from '@/services/admin.api'
import { certifications, experiences, locales, person, profile } from '../setup'

const collection = COLLECTIONS.certification

function seed(): ReturnType<typeof useContentStore> {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
  }
  content.singletons = { person: { ...person }, profile: { ...profile } }
  return content
}

describe('content store', () => {
  beforeEach(() => {
    vi.mocked(api.reorderDocuments).mockResolvedValue([])
    vi.mocked(api.deleteDocument).mockResolvedValue(undefined)
  })

  it('exposes locale codes in order', () => {
    expect(seed().langs).toEqual(['en', 'fr', 'nl'])
  })

  it('sends a reorder payload of id and order pairs', async () => {
    const content = seed()
    vi.mocked(api.reorderDocuments).mockResolvedValue([
      { ...certifications[1], order: 0 },
      { ...certifications[0], order: 1 },
    ])

    await content.reorder(collection, ['c2', 'c1'])

    expect(api.reorderDocuments).toHaveBeenCalledWith('admin/certifications', [
      { id: 'c2', order: 0 },
      { id: 'c1', order: 1 },
    ])
    expect(content.list('certification').map((doc) => doc.id)).toEqual(['c2', 'c1'])
  })

  it('rolls back the order when the reorder request fails', async () => {
    const content = seed()
    vi.mocked(api.reorderDocuments).mockRejectedValue(new Error('429'))

    await expect(content.reorder(collection, ['c2', 'c1'])).rejects.toThrow('429')
    expect(content.list('certification').map((doc) => doc.id)).toEqual(['c1', 'c2'])
  })

  it('restores the list when a delete fails', async () => {
    const content = seed()
    vi.mocked(api.deleteDocument).mockRejectedValue(new Error('500'))

    await expect(content.remove(collection, 'c1')).rejects.toThrow('500')
    expect(content.list('certification')).toHaveLength(2)
  })

  it('records an inverse update that restores the previous value', async () => {
    const content = seed()
    const history = useHistoryStore()

    vi.mocked(api.updateDocument).mockResolvedValue({ ...certifications[0], title: 'Renamed' })
    await content.update(collection, 'c1', { title: 'Renamed' })
    expect(content.find('certification', 'c1')?.title).toBe('Renamed')

    vi.mocked(api.updateDocument).mockResolvedValue({ ...certifications[0] })
    await history.undo()

    expect(api.updateDocument).toHaveBeenLastCalledWith('admin/certifications', 'c1', {
      title: 'AI-900',
    })
    expect(content.find('certification', 'c1')?.title).toBe('AI-900')
  })

  it('undoes a create by deleting the new document', async () => {
    const content = seed()
    const history = useHistoryStore()

    vi.mocked(api.createDocument).mockResolvedValue({ id: 'c3', order: 2, title: 'New' })
    await content.create(collection, { id: '', icon: 'Zap', title: 'New', issuer: 'X' })
    expect(content.list('certification')).toHaveLength(3)

    await history.undo()

    expect(api.deleteDocument).toHaveBeenCalledWith('admin/certifications', 'c3')
    expect(content.list('certification')).toHaveLength(2)
  })

  it('caps the undo stack at twenty entries', async () => {
    const history = useHistoryStore()
    for (let index = 0; index < 25; index += 1) {
      history.record(`change ${index}`, () => Promise.resolve())
    }
    expect(history.entries).toHaveLength(20)
    expect(history.nextLabel).toBe('change 24')
  })

  it('exports every collection as JSON', () => {
    const payload = JSON.parse(seed().exportAll())
    expect(payload.certification).toHaveLength(2)
    expect(payload.locale).toHaveLength(3)
    expect(payload).toHaveProperty('profile')
  })
})

describe('preview payload', () => {
  it('renders the edited document among its real siblings', async () => {
    const { buildPreviewPayload } = await import('@/utils/preview-payload')
    const edited = { ...certifications[0], title: 'AI-900 renewed' }

    const payload = buildPreviewPayload(COLLECTIONS.certification, edited, 'en', {
      locales: locales.map(({ code, flagCode }) => ({ code, flagCode })),
      person,
      profile,
      lists: { certification: certifications },
    }) as { education: { certifications: { id: string; title: string }[] } }

    const list = payload.education.certifications
    expect(list).toHaveLength(certifications.length)
    expect(list.find((entry) => entry.id === edited.id)?.title).toBe('AI-900 renewed')
    expect(list.map((entry) => entry.id)).toEqual(certifications.map((entry) => entry.id))
  })

  it("carries the owner's asset folder so the preview can find the pictures", async () => {
    const { buildPreviewPayload } = await import('@/utils/preview-payload')
    const { setAssetPrefix } = await import('@/utils/assets')

    setAssetPrefix('owner-folder')

    const payload = buildPreviewPayload(COLLECTIONS.certification, certifications[0], 'en', {
      locales: locales.map(({ code, flagCode }) => ({ code, flagCode })),
      person,
      profile,
      lists: { certification: certifications },
    }) as { assetPrefix: string }

    expect(payload.assetPrefix).toBe('owner-folder')
    setAssetPrefix('')
  })

  it('carries every other collection so derived figures stay truthful', async () => {
    const { buildPreviewPayload } = await import('@/utils/preview-payload')

    const payload = buildPreviewPayload(COLLECTIONS.certification, certifications[0], 'en', {
      locales: [],
      person,
      profile,
      lists: { certification: certifications, experience: experiences },
    }) as { experiences: unknown[]; education: { certifications: unknown[] } }

    expect(payload.experiences).toHaveLength(experiences.length)
    expect(payload.education.certifications).toHaveLength(certifications.length)
  })

  it('appends a document that has not been created yet', async () => {
    const { buildPreviewPayload } = await import('@/utils/preview-payload')
    const fresh = { id: 'new', order: 9, title: 'Fresh', translations: { en: { date: 'Now' } } }

    const payload = buildPreviewPayload(COLLECTIONS.certification, fresh, 'en', {
      locales: [],
      person: null,
      profile: null,
      lists: { certification: certifications },
    }) as { education: { certifications: { id: string }[] } }

    expect(payload.education.certifications).toHaveLength(certifications.length + 1)
    expect(payload.education.certifications.at(-1)?.id).toBe('new')
  })
})

describe('a new entry lands first', () => {
  it('puts a created document at the head of the list', async () => {
    const content = seed()
    vi.mocked(api.createDocument).mockResolvedValue({
      id: 'brand-new',
      order: 0,
      title: 'Newest',
      issuer: 'Someone',
    })

    await content.create(collection, { id: 'new', title: 'Newest', issuer: 'Someone' })

    expect(content.list('certification')[0].id).toBe('brand-new')
  })

  it('shifts the entries it displaced, so the order matches what the API stored', async () => {
    const content = seed()
    const before = content.list('certification').map((doc) => doc.order)
    vi.mocked(api.createDocument).mockResolvedValue({ id: 'brand-new', order: 0, title: 'Newest' })

    await content.create(collection, { id: 'new', title: 'Newest' })

    const after = content.list('certification')
    expect(after[0].order).toBe(0)
    expect(after.slice(1).map((doc) => doc.order)).toEqual(before.map((order) => (order ?? 0) + 1))
  })

  it('leaves an unordered collection alone', async () => {
    const content = seed()
    vi.mocked(api.createDocument).mockResolvedValue({ id: 'x', order: 0, code: 'de' })

    await content.create(COLLECTIONS.locale, { id: 'new', code: 'de', label: 'DE' })

    expect(content.list('locale')[0].id).toBe('x')
  })
})
