import { test as base, type Page, type Route } from '@playwright/test'

export const REFRESH_TOKEN = 'e2e-refresh-token'

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function accessToken(groups: string[] = ['admin']): string {
  return `header.${base64Url({
    sub: 'e2e-user',
    exp: Math.floor(Date.now() / 1000) + 900,
    username: 'ada-lovelace',
    'cognito:groups': groups,
  })}.signature`
}

export const locales = [
  { id: 'l1', order: 0, code: 'en', flagCode: 'gb', enabled: true },
  { id: 'l2', order: 1, code: 'fr', flagCode: 'fr', enabled: true },
]

export const experiences = [
  {
    id: 'e1',
    order: 0,
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
  {
    id: 'e2',
    order: 1,
    company: 'Globex',
    startDate: '2024-01',
    endDate: '2025-06',
    country: 'FR',
    tags: [],
    doc: null,
    link: null,
    translations: { en: { role: 'Data Engineer', bullets: ['Shipped pipelines'] } },
  },
]

export const certifications = [
  {
    id: 'c1',
    order: 0,
    icon: 'Zap',
    title: 'AI-900',
    issuer: 'Microsoft',
    doc: 'certificate-azure-ai900.pdf',
    date: '2024-06',
  },
  {
    id: 'c2',
    order: 1,
    icon: 'Cloud',
    title: 'DP-900',
    issuer: 'Microsoft',
    doc: null,
    date: '2024-05',
  },
]

export const person = {
  id: 'p1',
  givenName: 'Ada',
  familyName: 'Lovelace',
  email: 'ada.lovelace@example.com',
  phone: '+33612345678',
  linkedin: 'https://www.linkedin.com/in/ada-lovelace',
  github: 'https://github.com/adalovelace',
  worksFor: 'Freelance',
  addressCountry: 'GB',
  photo: 'off-image.jpeg',
  logoLightTheme: 'folvyn-logo-dark.png',
  logoDarkTheme: 'folvyn-logo-light.png',
  resumes: { en: 'resume_en_ada-lovelace.pdf' },
  translations: {
    en: {
      jobTitle: 'Data engineer',
      description: 'Builds data platforms.',
      addressLocality: 'London',
      addressRegion: 'London',
    },
  },
}

export const profile = {
  id: 'pr1',
  key: 'primary',
  highlights: ['Python', 'Airflow'],
  highlightFocus: 'Python',
  translations: {
    en: {
      subtitles: ['Data engineer'],
      tagline: 'Builds **data platforms**.',
      aboutParagraphs: ['A paragraph about the work.'],
      contactDesc: 'Say hello.',
    },
  },
}

export interface ApiRecorder {
  calls: { method: string; url: string; body: unknown }[]
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

export async function stubApi(
  page: Page,
  recorder: ApiRecorder,
  groups = ['admin'],
): Promise<void> {
  await page.route('**/oauth2/token', (route) =>
    json(route, {
      access_token: accessToken(groups),
      refresh_token: REFRESH_TOKEN,
      expires_in: 900,
    }),
  )

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    recorder.calls.push({ method, url: path, body: request.postDataJSON?.() ?? null })

    if (path === '/health') return json(route, { status: 'ok', database: 'up' })
    if (path === '/admin/person') {
      return json(route, method === 'PATCH' ? { ...person, ...request.postDataJSON() } : person)
    }
    if (path === '/admin/profile') {
      return json(route, method === 'PATCH' ? { ...profile, ...request.postDataJSON() } : profile)
    }
    if (path === '/admin/locales') return json(route, locales)
    if (path === '/admin/experiences') return json(route, experiences)
    if (path === '/admin/uploads') return json(route, [])
    if (path.startsWith('/admin/analytics')) return json(route, { statusCode: 404 }, 404)

    if (path === '/admin/certifications') {
      if (method === 'POST') {
        return json(route, { id: 'c9', order: 2, ...request.postDataJSON() }, 201)
      }
      return json(route, certifications)
    }

    if (path.startsWith('/admin/experiences/')) {
      const id = path.split('/').pop() as string
      if (method === 'DELETE') return route.fulfill({ status: 204, body: '' })
      const existing = experiences.find((entry) => entry.id === id) ?? experiences[0]
      return json(route, { ...existing, ...request.postDataJSON() })
    }

    if (path.startsWith('/admin/certifications/')) {
      const id = path.split('/').pop() as string
      if (method === 'DELETE') return route.fulfill({ status: 204, body: '' })
      const existing = certifications.find((entry) => entry.id === id) ?? certifications[0]
      return json(route, { ...existing, ...request.postDataJSON() })
    }

    return json(route, [])
  })
}

export const test = base.extend<{ recorder: ApiRecorder; signedIn: Page }>({
  recorder: async ({}, use) => {
    await use({ calls: [] })
  },

  signedIn: async ({ page, recorder }, use) => {
    await stubApi(page, recorder)
    await page.addInitScript((token) => {
      sessionStorage.setItem('console_refresh_token', token)
    }, REFRESH_TOKEN)
    await use(page)
  },
})

export { expect } from '@playwright/test'
