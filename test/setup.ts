import { beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { config } from '@vue/test-utils'
import { RouterLinkStub } from '@vue/test-utils'
import { autosize } from '@/directives/autosize'
import type {
  AdminDocument,
  AdminLocale,
  AdminPerson,
  AdminProfile,
  OwnerRecord,
} from '@/types/admin'

export const locales: AdminLocale[] = [
  { id: 'l1', order: 0, code: 'en', label: 'English', flagCode: 'gb', enabled: true },
  { id: 'l2', order: 1, code: 'fr', label: 'Français', flagCode: 'fr', enabled: true },
  { id: 'l3', order: 2, code: 'nl', label: 'Nederlands', flagCode: 'nl', enabled: true },
]

export const certifications: AdminDocument[] = [
  {
    id: 'c1',
    order: 0,
    icon: 'Zap',
    title: 'AI-900',
    issuer: 'Microsoft',
    doc: 'certificate-azure-ai900.pdf',
    translations: { en: { date: 'June 2024' }, fr: { date: 'Juin 2024' } },
  },
  {
    id: 'c2',
    order: 1,
    icon: 'Cloud',
    title: 'DP-900',
    issuer: 'Microsoft',
    doc: null,
    translations: { en: { date: 'May 2024' } },
  },
]

export const person: AdminPerson = {
  id: 'p1',
  givenName: 'Mohamed Khalil',
  familyName: 'ZRELLY',
  email: 'hello@mkirell.com',
  phone: '+21612345678',
  linkedin: 'https://www.linkedin.com/in/mkirell',
  github: 'https://github.com/MKirell',
  affiliation: 'Freelance',
  city: 'Tunis',
  country: 'TN',
  photo: 'off-image.jpeg',
  resumes: { en: 'resume_en_mkzrelly.pdf' },
  translations: {
    en: {
      headline: 'Data engineer',
      aboutParagraphs: ['A paragraph about the work.'],
      contactDesc: 'Say hello.',
    },
  },
}

export const profile: AdminProfile = {
  id: 'pr1',
  highlights: ['Python', 'Airflow'],
  highlightFocus: ['Python'],
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
    company: 'Crédit Agricole',
    startDate: '2025-09',
    endDate: null,
    country: 'FR',
    tags: ['LangGraph'],
    doc: null,
    link: null,
    translations: {
      en: { role: 'GenAI Engineer', bullets: ['Built agents'] },
      fr: { role: 'Ingénieur IA', bullets: ['Développé des agents'] },
    },
  },
]

export const owner: OwnerRecord = {
  id: 'o1',
  slug: 'mohamed-khalil-zrelly',
  email: 'someone@example.com',
  displayName: 'Mohamed Khalil ZRELLY',
  status: 'draft',
  consentMode: 'measurement',
  plan: 'free',
  publishedAt: null,
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

config.global.stubs = { RouterLink: RouterLinkStub, teleport: true }
config.global.directives = { autosize }

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
