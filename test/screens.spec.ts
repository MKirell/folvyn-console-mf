import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useMediaStore } from '@/stores/media'
import { useUiStore } from '@/stores/ui'
import { useTheme } from '@/composables/useTheme'
import * as api from '@/services/admin.api'
import * as local from '@/services/local-assets'
import { listSnapshots, purgeExpiredSnapshots, putSnapshot } from '@/services/snapshots'
import type { AnalyticsSummary } from '@/types/analytics'
import { certifications, experiences, locales, owner, person, profile } from './setup'

const route = reactive<{
  params: Record<string, string>
  query: Record<string, string>
  meta: Record<string, unknown>
  path: string
  fullPath: string
}>({ params: {}, query: {}, meta: {}, path: '/', fullPath: '/' })

const push = vi.fn()
const replace = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push, replace }) }
})

const CallbackView = (await import('@/views/CallbackView.vue')).default
const NotFoundView = (await import('@/views/NotFoundView.vue')).default
const DashboardView = (await import('@/views/DashboardView.vue')).default
const HistoryView = (await import('@/views/HistoryView.vue')).default
const SingletonView = (await import('@/views/SingletonView.vue')).default
const MediaView = (await import('@/views/MediaView.vue')).default

const SUMMARY: AnalyticsSummary = {
  days: 30,
  from: '2026-07-06',
  to: '2026-08-05',
  totals: { sessions: 1903, visitors: 1284, bounced: 402, dwellMsAverage: 134000, docs: 37 },
  deltas: { sessions: 8, visitors: 12, dwellMs: -3, docs: 20 },
  trend: [
    { date: '2026-08-03', sessions: 60, visitors: 40 },
    { date: '2026-08-04', sessions: 72, visitors: 51 },
  ],
  referrers: [
    { key: 'linkedin.com', count: 412 },
    { key: '(direct)', count: 338 },
  ],
  langs: [
    { key: 'en', count: 800 },
    { key: 'fr', count: 400 },
  ],
  countries: [{ key: 'TN', count: 900 }],
  devices: [{ key: 'desktop', count: 1200 }],
  browsers: [{ key: 'chrome', count: 1100 }],
  entries: [{ key: 'hero', count: 1700 }],
  sections: [
    { key: 'hero', count: 1903 },
    { key: 'projects', count: 685 },
  ],
  cards: [
    { key: '68a1f0c2e4b0a1c2d3e4f5a6', impressions: 400, clicks: 120, rate: 30 },
    { key: '68a1f0c2e4b0a1c2d3e4f5b7', impressions: 380, clicks: 19, rate: 5 },
  ],
  scrollQuartiles: [1700, 1100, 620, 240],
  docsOpened: [{ key: 'resume_en_ada-lovelace.pdf', count: 37 }],
  outbound: [{ key: 'github.com', count: 28 }],
  contact: [{ key: 'email', count: 9 }],
  contactRate: 5,
  returning: 0,
  newVisitors: 0,
  shell: [{ key: 'help', count: 38 }],
  shellSessions: 43,
  errors: [{ key: 'TypeError: undefined', count: 3 }],
  vitals: { lcp: 1800, cls: 0.04, inp: 120, ttfb: null },
}

function seed() {
  const content = useContentStore()
  content.documents = {
    certification: certifications.map((doc) => ({ ...doc })),
    experience: experiences.map((doc) => ({ ...doc })),
    locale: locales.map((doc) => ({ ...doc })),
  }
  content.singletons = { person: { ...person }, profile: { ...profile } }
  content.loaded = true
  useUiStore().setEditingLang('en')
  return content
}

beforeEach(() => {
  route.params = {}
  route.query = {}
  push.mockClear()
  replace.mockClear()
})

describe('callback screen', () => {
  it('reports an identity-provider error without exchanging a code', async () => {
    route.query = { error: 'access_denied', error_description: 'User cancelled' }

    const wrapper = mount(CallbackView)
    await flushPromises()

    expect(wrapper.text()).toContain('User cancelled')
    expect(replace).not.toHaveBeenCalled()
  })

  it('reports a callback that carries no code', async () => {
    const wrapper = mount(CallbackView)
    await flushPromises()

    expect(wrapper.text()).toContain('did not return an authorization code')
  })

  it('sends anyone who signs in to where they were going', async () => {
    route.query = { code: 'c', state: 's' }
    const auth = useAuthStore()
    vi.spyOn(auth, 'completeLogin').mockResolvedValue('/insights')

    mount(CallbackView)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith('/insights')
  })

  it('surfaces a failed code exchange', async () => {
    route.query = { code: 'c', state: 's' }
    const auth = useAuthStore()
    vi.spyOn(auth, 'completeLogin').mockRejectedValue(new Error('state did not match'))

    const wrapper = mount(CallbackView)
    await flushPromises()

    expect(wrapper.text()).toContain('state did not match')
  })
})

describe('not found screen', () => {
  it('offers a way back to insights', async () => {
    const wrapper = mount(NotFoundView)
    await wrapper.find('button').trigger('click')

    expect(push).toHaveBeenCalledWith('/insights')
  })
})

describe('dashboard with data', () => {
  beforeEach(() => {
    vi.mocked(api.fetchAnalyticsSummary).mockResolvedValue(SUMMARY)
  })

  it('renders the KPI row, the funnel and the vitals verdicts', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('1,284')
    expect(wrapper.text()).toContain('2m 14s')
    expect(wrapper.text()).toContain('linkedin.com')
    expect(wrapper.text()).toContain('36%')
    expect(wrapper.text()).toContain('good')
  })

  it('omits a vital with no samples rather than showing a zero', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('ttfb')
  })

  it('never shows the owner a JavaScript error they cannot fix', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('TypeError')
    expect(wrapper.text()).not.toContain('JavaScript')
    expect(wrapper.text()).not.toContain('Errors')
  })

  it('shows only the load-speed verdict, not the metrics the owner does not control', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('How fast it loads')
    expect(wrapper.text()).toContain('1.8s to the main content')
    expect(wrapper.text()).not.toContain('inp')
    expect(wrapper.text()).not.toContain('cls')
  })

  it('points a slow portfolio at the images its owner uploaded', async () => {
    vi.mocked(api.fetchAnalyticsSummary).mockResolvedValue({
      ...SUMMARY,
      vitals: { ...SUMMARY.vitals, lcp: 4200 },
    })

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('needs work')
    expect(wrapper.text()).toContain('oversized image')
    expect(wrapper.text()).toContain('Review your images')
  })

  it('shows the card panel, and nothing in it, until the projects load', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('Which project earns attention')
    expect(wrapper.text()).toContain('No project has been on screen long enough')
  })

  it('never credits a card that is not one of this owner’s projects', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).not.toContain('68a1f0c2e4b0a1c2d3e4f5a6')
    expect(wrapper.text()).not.toContain('Put it first')
  })

  it('reads contact as a rate per session', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('Are they reaching out')
    expect(wrapper.text()).toContain('5% of sessions')
  })

  it('shows scroll depth as four labelled quartiles', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('How far down they read')
    expect(wrapper.text()).toContain('Past the hero')
    expect(wrapper.text()).toContain('To the very end')
    expect(wrapper.text()).toContain('Typical read')
  })

  it('folds a long breakdown into one other row so the panel keeps its height', async () => {
    vi.mocked(api.fetchAnalyticsSummary).mockResolvedValue({
      ...SUMMARY,
      countries: Array.from({ length: 30 }, (_, index) => ({
        key: `C${index}`,
        count: 300 - index * 5,
      })),
    })

    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('other')
    expect(wrapper.text()).not.toContain('C29')
  })

  it('shows who the visitors are, down to the browser', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('What they read on')
    expect(wrapper.text()).toContain('Which browser')
    expect(wrapper.text()).toContain('chrome')
    expect(wrapper.text()).toContain('desktop')
    expect(wrapper.text()).toContain('TN')
  })

  it('gives every panel its own width rather than a column of halves', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    const spans = wrapper
      .findAll('[class*="col-span-"]')
      .map((node) => /col-span-(\d+)/.exec(node.classes().join(' '))?.[1])
      .filter(Boolean)

    expect(new Set(spans).size).toBeGreaterThan(3)
  })

  it('reports the terminal discovery rate against visitors', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    expect(wrapper.text()).toContain('3.3% of visitors')
  })

  it('switches period and caches each one', async () => {
    const wrapper = mount(DashboardView)
    await flushPromises()

    const seven = wrapper.findAll('button').find((button) => button.text() === '7d')
    await seven?.trigger('click')
    await flushPromises()
    expect(api.fetchAnalyticsSummary).toHaveBeenLastCalledWith(7)

    const analytics = useAnalyticsStore()
    vi.mocked(api.fetchAnalyticsSummary).mockClear()
    await analytics.load(7)
    expect(api.fetchAnalyticsSummary).not.toHaveBeenCalled()
  })
})

describe('history screen', () => {
  it('lists undo entries and runs the newest one', async () => {
    const history = useHistoryStore()
    const inverse = vi.fn(() => Promise.resolve())
    history.record('Edit certification', inverse)

    const wrapper = mount(HistoryView)
    await flushPromises()

    expect(wrapper.text()).toContain('Edit certification')
    const undo = wrapper.findAll('button').find((button) => button.text().includes('Undo'))
    await undo?.trigger('click')
    await flushPromises()

    expect(inverse).toHaveBeenCalled()
    expect(history.entries).toHaveLength(0)
  })

  it('downloads the whole dataset as JSON', async () => {
    seed()
    const createObjectURL = vi.fn(() => 'blob:x')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const wrapper = mount(HistoryView)
    await flushPromises()
    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Export'))
    await exportButton?.trigger('click')

    expect(createObjectURL).toHaveBeenCalled()
    expect(useUiStore().toasts[0].message).toBe('Export downloaded')
    vi.unstubAllGlobals()
  })
})

describe('snapshots', () => {
  it('round-trips a snapshot through IndexedDB', async () => {
    await putSnapshot({
      id: 'certification:c1:1',
      collection: 'certification',
      documentId: 'c1',
      label: 'Certification',
      savedAt: Date.now(),
      document: { title: 'AI-900' },
    })

    const stored = await listSnapshots()
    expect(stored).toHaveLength(1)
    expect(stored[0].document).toEqual({ title: 'AI-900' })
  })

  it('drops snapshots older than the retention window', async () => {
    await putSnapshot({
      id: 'certification:c2:old',
      collection: 'certification',
      documentId: 'c2',
      label: 'Certification',
      savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      document: {},
    })

    await purgeExpiredSnapshots()
    const stored = await listSnapshots()

    expect(stored.some((entry) => entry.id === 'certification:c2:old')).toBe(false)
  })

  it('writes a snapshot before a document is edited', async () => {
    const content = seed()
    const history = useHistoryStore()
    vi.mocked(api.updateDocument).mockResolvedValue({ ...certifications[0], title: 'Renamed' })

    await content.update(
      { ...(await import('@/registry/collections')).COLLECTIONS.certification },
      'c1',
      { title: 'Renamed' },
    )
    await history.loadSnapshots()

    expect(history.snapshots.some((entry) => entry.documentId === 'c1')).toBe(true)
  })
})

describe('person screen preview', () => {
  it('offers a live preview tab, like the collection editors', async () => {
    seed()
    route.meta = { collections: ['person', 'profile'], title: 'Person' }

    const wrapper = mount(SingletonView)
    await flushPromises()

    expect(wrapper.text()).toContain('Live preview')
  })

  it('renders the preview once its tab is chosen', async () => {
    seed()
    route.meta = { collections: ['person', 'profile'], title: 'Person' }

    const wrapper = mount(SingletonView)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Live preview')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.find('iframe').exists()).toBe(true)
  })
})

describe('person screen', () => {
  it('sends only the changed identity field', async () => {
    seed()
    vi.mocked(api.updateSingleton).mockResolvedValue({ ...person, affiliation: 'Independent' })

    const wrapper = mount(SingletonView)
    const affiliation = wrapper
      .findAll('input[type="text"]')
      .find((input) => (input.element as HTMLInputElement).value === 'Freelance')
    await affiliation?.setValue('Independent')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() =>
      expect(api.updateSingleton).toHaveBeenCalledWith('admin/person', {
        affiliation: 'Independent',
      }),
    )
  })

  it('refuses a save that empties a required field', async () => {
    seed()
    vi.mocked(api.updateSingleton).mockClear()

    const wrapper = mount(SingletonView)
    const affiliation = wrapper
      .findAll('input[type="text"]')
      .find((input) => (input.element as HTMLInputElement).value === 'Freelance')
    await affiliation?.setValue('')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('is required')
    expect(api.updateSingleton).not.toHaveBeenCalled()
  })

  it('reports when the person document has not loaded', () => {
    const content = useContentStore()
    content.singletons = { person: null }
    content.loaded = true

    expect(mount(SingletonView).text()).toContain('has not loaded')
  })
})

describe('media screen', () => {
  it('filters the grid down to unreferenced files', async () => {
    seed()
    vi.mocked(api.listAssets).mockResolvedValueOnce([
      { key: 'certificate-azure-ai900.pdf', size: 1, lastModified: '2026-01-01' },
      { key: 'unused.pdf', size: 1, lastModified: '2026-01-01' },
    ])

    const wrapper = mount(MediaView)
    await flushPromises()
    await wrapper.find('select').setValue('orphan')

    expect(wrapper.text()).toContain('unused.pdf')
    expect(wrapper.text()).not.toContain('certificate-azure-ai900.pdf')
  })

  it('flags files the content references but the bucket lacks', async () => {
    seed()
    vi.mocked(api.listAssets).mockResolvedValueOnce([])
    const media = useMediaStore()
    await media.load(true)

    const wrapper = mount(MediaView)
    await flushPromises()

    expect(wrapper.text()).toContain('referenced file')
    expect(wrapper.text()).toContain('certificate-azure-ai900.pdf')
  })

  it('lists what the portfolio repo serves when no bucket is configured', async () => {
    seed()
    vi.mocked(api.fetchMe).mockResolvedValueOnce({ ...owner, assetPrefix: '' })
    vi.mocked(api.listAssets).mockClear()
    vi.spyOn(local, 'localAssetsEnabled').mockReturnValue(false)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-length': '2048',
        'last-modified': 'Wed, 01 Jul 2026 00:00:00 GMT',
      }),
    } as Response)

    const media = useMediaStore()
    await media.load(true)

    const wrapper = mount(MediaView)
    await flushPromises()

    expect(media.source).toBe('repo')
    expect(api.listAssets).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("Served from your portfolio's repo")
    expect(wrapper.text()).toContain('certificate-azure-ai900.pdf')
    expect(wrapper.text()).toContain('2 kB')
  })

  it('leaves a repo-backed file undeletable once the app is built', async () => {
    seed()
    vi.mocked(api.fetchMe).mockResolvedValueOnce({ ...owner, assetPrefix: '' })
    vi.spyOn(local, 'localAssetsEnabled').mockReturnValue(false)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-length': '1' }),
    } as Response)

    const media = useMediaStore()
    await media.load(true)

    const wrapper = mount(MediaView)
    await flushPromises()

    const remove = wrapper.find('button[aria-label="Delete"]')
    expect(remove.attributes('disabled')).toBeDefined()
  })

  it('drops a referenced key the repo does not actually serve', async () => {
    seed()
    vi.mocked(api.fetchMe).mockResolvedValueOnce({ ...owner, assetPrefix: '' })
    vi.spyOn(local, 'localAssetsEnabled').mockReturnValue(false)
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      headers: new Headers(),
    } as Response)

    const media = useMediaStore()
    await media.load(true)

    expect(media.assets).toEqual([])
    expect(media.missing.length).toBeGreaterThan(0)
  })

  it('writes an upload straight into the repo when running locally', async () => {
    seed()
    vi.mocked(api.fetchMe).mockResolvedValueOnce({ ...owner, assetPrefix: '' })
    vi.spyOn(local, 'localAssetsEnabled').mockReturnValue(true)
    vi.spyOn(local, 'listLocalAssets').mockResolvedValue([])
    const put = vi
      .spyOn(local, 'putLocalAsset')
      .mockResolvedValue({ key: 'new-file.pdf', size: 12, lastModified: '2026-08-19' })

    const media = useMediaStore()
    await media.load(true)

    expect(media.writable).toBe(true)

    const key = await media.upload(new File(['x'], 'New File.pdf', { type: 'application/pdf' }))

    expect(key).toBe('new-file.pdf')
    expect(put).toHaveBeenCalled()
    expect(api.presignUpload).not.toHaveBeenCalled()
    expect(media.assets.map((asset) => asset.key)).toContain('new-file.pdf')
  })

  it('deletes through the repo endpoint when running locally', async () => {
    seed()
    vi.mocked(api.fetchMe).mockResolvedValueOnce({ ...owner, assetPrefix: '' })
    vi.spyOn(local, 'localAssetsEnabled').mockReturnValue(true)
    vi.spyOn(local, 'listLocalAssets').mockResolvedValue([
      { key: 'unused.pdf', size: 1, lastModified: '2026-08-19' },
    ])
    const remove = vi.spyOn(local, 'deleteLocalAsset').mockResolvedValue()

    const media = useMediaStore()
    await media.load(true)
    await media.remove('unused.pdf')

    expect(remove).toHaveBeenCalledWith('unused.pdf')
    expect(api.deleteAsset).not.toHaveBeenCalled()
    expect(media.assets).toEqual([])
  })

  it('copies a key to the clipboard', async () => {
    seed()
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    vi.mocked(api.listAssets).mockResolvedValueOnce([
      { key: 'unused.pdf', size: 1, lastModified: '2026-01-01' },
    ])

    const wrapper = mount(MediaView)
    await flushPromises()
    await wrapper.find('button[aria-label="Copy key"]').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('unused.pdf')
  })
})

describe('hero & story screen', () => {
  it('carries no generic interface copy', () => {
    seed()
    route.meta = { collection: 'profile' }

    const text = mount(SingletonView).text()

    expect(text).not.toContain('nav.about')
    expect(text).toContain('Hero')
  })
})

describe('theme', () => {
  it('stamps the chosen scheme on the root element', () => {
    const { theme, toggleTheme } = useTheme()
    const before = theme.value

    toggleTheme()

    expect(theme.value).not.toBe(before)
    expect(document.documentElement.classList.contains(`scheme-${theme.value}`)).toBe(true)
    expect(localStorage.getItem('console_theme')).toBe(theme.value)
  })
})
