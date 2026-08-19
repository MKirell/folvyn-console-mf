import { beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { config } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { autosize } from '@/directives/autosize'
import { i18n } from '@/i18n'
import type {
  AdminDocument,
  AdminLocale,
  AdminPerson,
  AdminProfile,
  OwnerRecord,
} from '@/types/admin'

export const locales: AdminLocale[] = [
  { id: 'l1', order: 0, code: 'en', flagCode: 'gb', enabled: true },
  { id: 'l2', order: 1, code: 'fr', flagCode: 'fr', enabled: true },
  { id: 'l3', order: 2, code: 'nl', flagCode: 'nl', enabled: true },
]

export const certifications: AdminDocument[] = [
  {
    id: 'c1',
    order: 0,
    icon: 'Zap',
    title: 'AI-900',
    issuer: 'Microsoft',
    doc: 'certificate-azure-ai900.pdf',
    date: '2024-06',
    translations: { en: {}, fr: {} },
  },
  {
    id: 'c2',
    order: 1,
    icon: 'Cloud',
    title: 'DP-900',
    issuer: 'Microsoft',
    doc: null,
    date: '2024-05',
    translations: { en: {} },
  },
]

export const person: AdminPerson = {
  id: 'p1',
  givenName: 'Ada',
  familyName: 'Lovelace',
  email: 'ada.lovelace@example.com',
  phone: '+33612345678',
  linkedin: 'https://www.linkedin.com/in/ada-lovelace',
  github: 'https://github.com/adalovelace',
  affiliation: 'Freelance',
  country: 'GB',
  city: 'London',
  photo: 'off-image.jpeg',
  resumes: { en: 'resume_en_ada-lovelace.pdf' },
  translations: {
    en: {
      headline: 'Data engineer',
      aboutParagraphs: ['A paragraph about the work.'],
    },
  },
}

export const profile: AdminProfile = {
  id: 'pr1',
  translations: {
    en: {
      subtitles: ['Data engineer'],
      tagline: 'Builds **data platforms**.',
    },
  },
}

export const experiences: AdminDocument[] = [
  {
    id: 'e1',
    order: 0,
    current: true,
    company: 'Acme Corp',
    startDate: '2025-09',
    endDate: null,
    country: 'FR',
    tags: ['LangGraph'],
    doc: null,
    link: null,
    translations: {
      en: { role: 'Backend Engineer', bullets: ['Built agents'] },
      fr: { role: 'Ingénieur backend', bullets: ['Développé des agents'] },
    },
  },
]

export const owner: OwnerRecord = {
  id: 'o1',
  slug: 'ada-lovelace',
  email: 'someone@example.com',
  displayName: 'Ada Lovelace',
  status: 'draft',
  consentMode: 'measurement',
  plan: 'free',
  publishedAt: null,
  assetPrefix: 'o1',
}

vi.mock('@/services/admin.api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      readonly status = 400,
      readonly messages: string[] = [message],
      readonly body: unknown = null,
    ) {
      super(message)
    }
    get isValidation(): boolean {
      return this.status === 400 || this.status === 422
    }
  },
  setTokenProvider: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  listDocuments: vi.fn(() => Promise.resolve([])),
  createDocument: vi.fn((_path: string, payload: object) =>
    Promise.resolve({ id: 'new-id', order: 9, ...payload }),
  ),
  updateDocument: vi.fn((_path: string, id: string, payload: object) =>
    Promise.resolve({ id, order: 0, ...payload }),
  ),
  deleteDocument: vi.fn(() => Promise.resolve()),
  reorderDocuments: vi.fn(() => Promise.resolve([])),
  fetchSingleton: vi.fn((path: string) =>
    Promise.resolve(path.endsWith('profile') ? profile : person),
  ),
  updateSingleton: vi.fn((path: string, payload: object) =>
    Promise.resolve({ ...(path.endsWith('profile') ? profile : person), ...payload }),
  ),
  fetchLocales: vi.fn(() => Promise.resolve(locales)),
  presignUpload: vi.fn(() =>
    Promise.resolve({ url: 'https://bucket.example/put', key: 'file.pdf', expiresIn: 300 }),
  ),
  listAssets: vi.fn(() => Promise.resolve([])),
  deleteAsset: vi.fn(() => Promise.resolve()),
  fetchAnalyticsSummary: vi.fn(() => Promise.reject(new Error('no analytics'))),
  fetchHealth: vi.fn(() => Promise.resolve({ status: 'ok' })),
  putToBucket: vi.fn(() => Promise.resolve()),
  fetchMe: vi.fn(() => Promise.resolve(owner)),
  publishPortfolio: vi.fn(() => Promise.resolve({ ...owner, status: 'published' })),
  unpublishPortfolio: vi.fn(() => Promise.resolve({ ...owner, status: 'draft' })),
  updateMe: vi.fn((payload: { consentMode: string }) => Promise.resolve({ ...owner, ...payload })),
  exportMe: vi.fn(() => Promise.resolve({ owner })),
  eraseMe: vi.fn(() => Promise.resolve()),
  checkSlug: vi.fn((slug: string) => Promise.resolve({ slug, available: true, reason: null })),
  fetchPlatformOverview: vi.fn(() => Promise.reject(new Error('no platform data'))),
  fetchPlatformHealth: vi.fn(() => Promise.reject(new Error('no platform data'))),
  fetchPortfolios: vi.fn(() => Promise.resolve([])),
  suspendPortfolio: vi.fn(() => Promise.resolve()),
  restorePortfolio: vi.fn(() => Promise.resolve()),
  exportPortfolio: vi.fn(() => Promise.resolve({})),
  erasePortfolio: vi.fn(() => Promise.resolve()),
  fetchAuditLog: vi.fn(() => Promise.resolve([])),
}))

beforeEach(() => {
  setActivePinia(createPinia())
})

config.global.plugins = [i18n]
config.global.stubs = { RouterLink: RouterLinkStub, teleport: true }
config.global.directives = { autosize }

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  writable: true,
  configurable: true,
  value: () => null,
})

const { origin, href, pathname, search, hash } = window.location

Object.defineProperty(window, 'location', {
  writable: true,
  configurable: true,
  value: { origin, href, pathname, search, hash, assign: vi.fn(), replace: vi.fn() },
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { ...globalThis.crypto, randomUUID: () => `id-${Math.random().toString(16).slice(2)}` },
  })
}
