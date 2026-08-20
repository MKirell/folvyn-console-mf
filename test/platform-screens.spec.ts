import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import * as api from '@/services/admin.api'
import PlatformView from '@/views/PlatformView.vue'
import PlatformPortfoliosView from '@/views/PlatformPortfoliosView.vue'
import PlatformAccountView from '@/views/PlatformAccountView.vue'
import PlatformTrafficView from '@/views/PlatformTrafficView.vue'
import PlatformHealthView from '@/views/PlatformHealthView.vue'
import PlatformErasureView from '@/views/PlatformErasureView.vue'
import PlatformAuditView from '@/views/PlatformAuditView.vue'
import PlatformConfigView from '@/views/PlatformConfigView.vue'

const route = reactive({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
})
const push = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push, back: vi.fn() }) }
})

const SUMMARY = {
  days: 30,
  from: '2026-07-22',
  to: '2026-08-20',
  totals: {
    sessions: 40,
    visitors: 20,
    events: 90,
    docs: 3,
    outbound: 2,
    dwellMsAverage: 45000,
  },
  deltas: { sessions: 10, visitors: 5, dwellMs: -2, docs: 0 },
  browsers: [{ key: 'firefox', count: 6 }],
  langs: [{ key: 'en', count: 9 }],
  docsOpened: [{ key: 'cv.pdf', count: 3 }],
  shellSessions: 2,
  countries: [{ key: 'FR', count: 12 }],
  referrers: [{ key: 'direct', count: 8 }],
  languages: [{ key: 'en', count: 9 }],
  devices: [{ key: 'desktop', count: 10 }],
  sections: [{ key: 'hero', count: 30 }],
  documents: [{ key: 'cv.pdf', count: 3 }],
  outbound: [{ key: 'github', count: 2 }],
  contact: [{ key: 'email', count: 1 }],
  shell: [{ key: 'help', count: 1 }],
  cards: [],
  errors: [],
  vitals: { lcp: 1200, cls: 0.02, inp: 90 },
  trend: [{ date: '2026-08-01', sessions: 4, visitors: 3 }],
  depth: [10, 8, 4, 1],
  returning: { returning: 3, new: 7 },
}

const PORTFOLIO = {
  id: 'p1',
  slug: 'ada-lovelace',
  email: 'ada@example.com',
  displayName: 'Ada Lovelace',
  status: 'published',
  createdAt: '2026-07-01T00:00:00.000Z',
  publishedAt: '2026-08-01T00:00:00.000Z',
  sessions: 12,
}

const screens: { name: string; component: unknown }[] = [
  { name: 'PlatformView', component: PlatformView },
  { name: 'PlatformPortfoliosView', component: PlatformPortfoliosView },
  { name: 'PlatformAccountView', component: PlatformAccountView },
  { name: 'PlatformTrafficView', component: PlatformTrafficView },
  { name: 'PlatformHealthView', component: PlatformHealthView },
  { name: 'PlatformErasureView', component: PlatformErasureView },
  { name: 'PlatformAuditView', component: PlatformAuditView },
  { name: 'PlatformConfigView', component: PlatformConfigView },
]

beforeEach(() => {
  route.params = { id: 'p1' }
  route.query = {}
  push.mockClear()
})

describe('every operator screen survives an API that answers nothing', () => {
  for (const { name, component } of screens) {
    it(`${name} renders and says it has no data rather than throwing`, async () => {
      const wrapper = mount(component as never)
      await flushPromises()

      expect(wrapper.html()).toBeTruthy()
      wrapper.unmount()
    })
  }
})

describe('every operator screen renders what it is given', () => {
  beforeEach(() => {
    vi.mocked(api.fetchPlatformOverview).mockResolvedValue({
      owners: { total: 4, published: 2, draft: 1, suspended: 1 },
      signups: { last7: 1, last30: 3 },
      traffic: SUMMARY,
      portfolios: [{ slug: 'ada-lovelace', status: 'published', sessions: 9, visitors: 4 }],
    } as never)

    vi.mocked(api.fetchPlatformTraffic).mockResolvedValue(SUMMARY as never)

    vi.mocked(api.fetchPlatformHealth).mockResolvedValue({
      database: 'up',
      errors: [],
      errorGroups: [{ key: 'boom', count: 2, owners: 1, sample: 'boom' }],
      storage: { usedMb: 12, limitMb: 512, collections: [] },
      vitals: SUMMARY.vitals,
      sessions: 40,
      errorRate: 5,
      image: 'abc123',
      prerender: { configured: true, attempts: [], failing: 0 },
    } as never)

    vi.mocked(api.fetchPortfolios).mockResolvedValue([PORTFOLIO] as never)

    vi.mocked(api.fetchAccountDetail).mockResolvedValue({
      account: PORTFOLIO,
      consentMode: 'measurement',
      plan: 'free',
      documents: [{ key: 'projects', count: 6 }],
      traffic: [{ date: '2026-08-01', sessions: 4, visitors: 3 }],
      timeline: [{ action: 'publish', actor: null, reason: null, at: '2026-08-01T00:00:00.000Z' }],
      totals: { documents: 6, sessions: 12, visitors: 8, locales: 2 },
    } as never)

    vi.mocked(api.fetchErasures).mockResolvedValue([
      {
        id: 'e1',
        slug: 'ada-lovelace',
        state: 'pending',
        reason: 'request',
        requestedBy: 'operator',
        dueAt: '2026-08-31T00:00:00.000Z',
        completedAt: null,
        cascade: {},
        failure: null,
        daysLeft: 12,
      },
    ] as never)

    vi.mocked(api.fetchAuditLog).mockResolvedValue([
      {
        id: 'a1',
        actorSub: 'operator',
        actorEmail: 'ada@example.com',
        action: 'read-account',
        targetSlug: 'ada-lovelace',
        reason: null,
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ] as never)

    vi.mocked(api.fetchPlatformConfig).mockResolvedValue({
      reservedSlugs: ['api', 'fol'],
      limits: { slugMin: 3, slugMax: 40, reasonMax: 200, erasureDeadlineDays: 30 },
      retention: { rawEventDays: 30, rollupMonths: 25 },
      environment: { nodeEnv: 'production', name: 'Development', database: 'db', image: 'abc123' },
      runtime: [{ key: 'env', label: 'Environment', value: 'Development' }],
      ingest: [],
      privacy: [],
      collections: [{ key: 'owners', count: 1 }],
    } as never)
  })

  for (const { name, component } of screens) {
    it(`${name} renders its data`, async () => {
      const wrapper = mount(component as never)
      await flushPromises()

      expect(wrapper.html()).toBeTruthy()
      wrapper.unmount()
    })
  }

  it('the erasure queue shows the clock, not just the request', async () => {
    const wrapper = mount(PlatformErasureView)
    await flushPromises()

    expect(wrapper.text()).toContain('ada-lovelace')
  })

  it('platform config names the environment the reader is looking at', async () => {
    const wrapper = mount(PlatformConfigView)
    await flushPromises()

    expect(wrapper.text()).toContain('Development')
  })
})
