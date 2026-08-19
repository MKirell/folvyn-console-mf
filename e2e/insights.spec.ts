import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

const DAYS = 90

function pick(weights: [string, number][], total: number) {
  return weights.map(([key, share]) => ({ key, count: Math.round(total * share) }))
}

const trend = Array.from({ length: DAYS }, (_, index) => {
  const at = new Date(Date.UTC(2026, 4, 12))
  at.setUTCDate(at.getUTCDate() + index)
  const weekend = [0, 6].includes(at.getUTCDay())
  const sessions = Math.round(
    40 * (1 + index / 120) * (1 + Math.sin(index / 6) * 0.25) * (weekend ? 0.55 : 1),
  )
  return { date: at.toISOString().slice(0, 10), sessions, visitors: Math.round(sessions * 0.68) }
})

const sessions = trend.reduce((sum, point) => sum + point.sessions, 0)

const SUMMARY = {
  days: DAYS,
  from: trend[0].date,
  to: trend[trend.length - 1].date,
  totals: {
    sessions,
    visitors: Math.round(sessions * 0.68),
    bounced: Math.round(sessions * 0.22),
    dwellMsAverage: 138_000,
    docs: 412,
  },
  deltas: { sessions: 14, visitors: 9, dwellMs: -4, docs: 22 },
  trend,
  referrers: pick(
    [
      ['linkedin.com', 0.34],
      ['(direct)', 0.28],
      ['google.com', 0.19],
      ['github.com', 0.09],
      ['news.ycombinator.com', 0.06],
      ['x.com', 0.04],
    ],
    sessions,
  ),
  langs: pick(
    [
      ['en', 0.56],
      ['fr', 0.36],
      ['nl', 0.08],
    ],
    sessions,
  ),
  countries: pick(
    [
      ['TN', 0.31],
      ['FR', 0.24],
      ['DE', 0.12],
      ['US', 0.11],
      ['GB', 0.08],
      ['NL', 0.06],
      ['CA', 0.05],
      ['BE', 0.03],
    ],
    sessions,
  ),
  devices: pick(
    [
      ['desktop', 0.58],
      ['mobile', 0.36],
      ['tablet', 0.06],
    ],
    sessions,
  ),
  browsers: pick(
    [
      ['chrome', 0.52],
      ['safari', 0.22],
      ['firefox', 0.14],
      ['edge', 0.09],
      ['other', 0.03],
    ],
    sessions,
  ),
  entries: pick(
    [
      ['hero', 0.78],
      ['projects', 0.13],
      ['experience', 0.09],
    ],
    sessions,
  ),
  sections: pick(
    [
      ['hero', 1],
      ['about', 0.72],
      ['experience', 0.58],
      ['projects', 0.41],
      ['skills', 0.33],
      ['education', 0.26],
      ['achievements', 0.19],
      ['contact', 0.14],
    ],
    sessions,
  ),
  cards: [
    { key: 'p1', impressions: 1840, clicks: 552, rate: 30 },
    { key: 'p2', impressions: 1610, clicks: 322, rate: 20 },
    { key: 'p3', impressions: 1490, clicks: 179, rate: 12 },
    { key: 'p4', impressions: 1320, clicks: 66, rate: 5 },
  ],
  scrollQuartiles: [
    Math.round(sessions * 0.88),
    Math.round(sessions * 0.61),
    Math.round(sessions * 0.37),
    Math.round(sessions * 0.16),
  ],
  docsOpened: pick(
    [
      ['resume_en_ada-lovelace.pdf', 0.46],
      ['resume_fr_ada-lovelace.pdf', 0.21],
      ['degree-bachelor-2024.pdf', 0.18],
      ['certificate-azure-ai900.pdf', 0.15],
    ],
    412,
  ),
  outbound: pick(
    [
      ['github.com', 0.51],
      ['npmjs.com', 0.22],
      ['medium.com', 0.16],
    ],
    260,
  ),
  contact: pick(
    [
      ['email', 0.44],
      ['linkedin', 0.33],
      ['github', 0.15],
      ['phone', 0.08],
    ],
    186,
  ),
  contactRate: 5,
  returning: 0,
  newVisitors: 0,
  shell: pick(
    [
      ['help', 0.42],
      ['ls', 0.25],
      ['whoami', 0.18],
      ['cat', 0.15],
    ],
    98,
  ),
  shellSessions: 142,
  errors: [{ key: 'TypeError: undefined', count: 3 }],
  vitals: { lcp: 2180, cls: 62, inp: 176, ttfb: 310 },
}

const PANELS = [
  'Visitors',
  'Where they came from',
  'How far they get',
  'Which project earns attention',
  'How far down they read',
  'When they came',
  'What they read on',
  'Where they are',
  'Which browser',
  'Which document is worth showing',
  'Are they reaching out',
  'Where they went next',
  'Terminal',
  'How fast it loads',
  'Languages',
]

async function stubSummary(page: Page, overrides: Partial<typeof SUMMARY> = {}): Promise<void> {
  await page.route('**/api/v1/admin/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'p1', order: 0, translations: { en: { title: 'Folvyn' } } },
        { id: 'p2', order: 1, translations: { en: { title: 'Atlas Migrator' } } },
        { id: 'p3', order: 2, translations: { en: { title: 'Shellbird' } } },
        { id: 'p4', order: 3, translations: { en: { title: 'Tideline' } } },
      ]),
    }),
  )

  await page.route('**/api/v1/admin/analytics/summary*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...SUMMARY, ...overrides }),
    }),
  )
}

test.describe('insights design', () => {
  test('renders every panel with data', async ({ signedIn }) => {
    await stubSummary(signedIn)

    await signedIn.setViewportSize({ width: 1440, height: 1400 })
    await signedIn.goto('/insights')
    for (const panel of PANELS) {
      await expect(signedIn.getByRole('heading', { level: 2, name: panel })).toBeVisible()
    }

    await expect(signedIn.getByText('Folvyn is opened by 30%')).toBeVisible()
  })

  test('holds its shape when a breakdown has far more rows than it can show', async ({
    signedIn,
  }) => {
    await stubSummary(signedIn, {
      countries: Array.from({ length: 40 }, (_, index) => ({
        key: `C${index}`,
        count: 400 - index * 7,
      })),
    })

    await signedIn.setViewportSize({ width: 1440, height: 1400 })
    await signedIn.goto('/insights')
    await expect(signedIn.getByRole('heading', { level: 2, name: 'Where they are' })).toBeVisible()

    const panel = signedIn
      .locator('section')
      .filter({ has: signedIn.getByRole('heading', { level: 2, name: 'Where they are' }) })

    await expect(panel.getByRole('listitem')).toHaveCount(6)
    await expect(panel.getByText('other', { exact: true })).toBeVisible()
  })

  test('leaves no gap in any grid row', async ({ signedIn }) => {
    await stubSummary(signedIn)
    await signedIn.setViewportSize({ width: 1440, height: 1400 })
    await signedIn.goto('/insights')
    await expect(
      signedIn.getByRole('heading', { level: 2, name: 'How far they get' }),
    ).toBeVisible()

    const rows = await signedIn.evaluate(() => {
      const grid = document.querySelector('main .grid-cols-12')
      if (!grid) return []

      const byTop = new Map<number, number>()
      for (const child of Array.from(grid.children)) {
        const box = child.getBoundingClientRect()
        const top = Math.round(box.top)
        byTop.set(top, (byTop.get(top) ?? 0) + box.width)
      }

      const width = grid.getBoundingClientRect().width
      return [...byTop.values()].map((filled) => Math.round(width - filled))
    })

    expect(rows.length).toBeGreaterThan(6)
    for (const slack of rows) expect(slack).toBeLessThan(60)
  })

  test('never scrolls sideways, at any width', async ({ signedIn }) => {
    await stubSummary(signedIn)

    for (const width of [1440, 1100, 760, 420]) {
      await signedIn.setViewportSize({ width, height: 1200 })
      await signedIn.goto('/insights')
      await expect(signedIn.getByRole('heading', { level: 2, name: 'Insights' })).toBeVisible()

      const overflow = await signedIn.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `overflows at ${width}px`).toBeLessThanOrEqual(0)
    }
  })
})
