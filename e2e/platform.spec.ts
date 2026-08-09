import { REFRESH_TOKEN, expect, stubApi, test } from './fixtures'
import type { Page } from '@playwright/test'

const DAYS = 90

const trend = Array.from({ length: DAYS }, (_, index) => {
  const at = new Date(Date.UTC(2026, 4, 12))
  at.setUTCDate(at.getUTCDate() + index)
  const weekend = [0, 6].includes(at.getUTCDay())
  const sessions = Math.round(
    120 * (1 + index / 90) * (1 + Math.sin(index / 5) * 0.28) * (weekend ? 0.6 : 1),
  )
  return { date: at.toISOString().slice(0, 10), sessions, visitors: Math.round(sessions * 0.66) }
})

const sessions = trend.reduce((sum, point) => sum + point.sessions, 0)

const OVERVIEW = {
  owners: { total: 48, published: 31, draft: 14, suspended: 3 },
  signups: { last7: 5, last30: 17 },
  portfolios: [
    { slug: 'mohamed-khalil-zrelly', status: 'published', sessions: 1840, visitors: 1210 },
    { slug: 'ada-lovelace', status: 'published', sessions: 1320, visitors: 890 },
    { slug: 'grace-hopper', status: 'published', sessions: 940, visitors: 610 },
    { slug: 'alan-turing', status: 'draft', sessions: 420, visitors: 280 },
    { slug: 'katherine-johnson', status: 'published', sessions: 310, visitors: 205 },
    { slug: 'margaret-hamilton', status: 'published', sessions: 180, visitors: 120 },
  ],
  traffic: {
    days: DAYS,
    from: trend[0].date,
    to: trend[trend.length - 1].date,
    totals: {
      sessions,
      visitors: Math.round(sessions * 0.66),
      bounced: Math.round(sessions * 0.2),
      dwellMsAverage: 142_000,
      docs: 980,
    },
    deltas: { sessions: 18, visitors: 12, dwellMs: 3, docs: 27 },
    trend,
    referrers: [
      { key: 'linkedin.com', count: 4120 },
      { key: '(direct)', count: 3380 },
      { key: 'google.com', count: 2190 },
      { key: 'github.com', count: 910 },
      { key: 'news.ycombinator.com', count: 620 },
      { key: 'x.com', count: 430 },
      { key: 'reddit.com', count: 210 },
      { key: 'bing.com', count: 140 },
    ],
    langs: [{ key: 'en', count: 900 }],
    countries: [{ key: 'TN', count: 900 }],
    devices: [{ key: 'desktop', count: 900 }],
    browsers: [{ key: 'chrome', count: 900 }],
    entries: [{ key: 'hero', count: 900 }],
    sections: [{ key: 'hero', count: 900 }],
    cards: [],
    scrollQuartiles: [800, 500, 300, 120],
    docsOpened: [{ key: 'resume.pdf', count: 980 }],
    outbound: [{ key: 'github.com', count: 260 }],
    contact: [{ key: 'email', count: 180 }],
    contactRate: 4,
    returning: 0,
    newVisitors: 0,
    shell: [{ key: 'help', count: 98 }],
    shellSessions: 142,
    errors: [
      { key: 'TypeError: undefined is not a function', count: 12 },
      { key: 'ResizeObserver loop limit exceeded', count: 5 },
    ],
    vitals: { lcp: 2180, cls: 62, inp: 176, ttfb: 310 },
  },
}

async function stubOverview(page: Page): Promise<void> {
  await page.route('**/api/v1/platform/overview*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(OVERVIEW),
    }),
  )
}

test.describe('operator overview', () => {
  test.beforeEach(async ({ page, recorder }) => {
    await stubApi(page, recorder, ['folvyn-platform'])
    await page.addInitScript((token) => {
      sessionStorage.setItem('console_refresh_token', token)
    }, REFRESH_TOKEN)
  })

  test('reads as one screen with the owner console', async ({ page }) => {
    await stubOverview(page)
    await page.setViewportSize({ width: 1440, height: 1400 })
    await page.goto('/platform')

    for (const panel of [
      'Traffic',
      'Where visitors come from',
      'When the platform is busy',
      'Portfolio states',
      'Busiest portfolios',
      'Needs attention',
      'Sign-ups',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: panel })).toBeVisible()
    }
  })

  test('leaves no gap in any grid row', async ({ page }) => {
    await stubOverview(page)
    await page.setViewportSize({ width: 1440, height: 1400 })
    await page.goto('/platform')
    await expect(page.getByRole('heading', { level: 2, name: 'Traffic' })).toBeVisible()

    const rows = await page.evaluate(() => {
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

    expect(rows.length).toBeGreaterThan(3)
    for (const slack of rows) expect(slack).toBeLessThan(60)
  })

  test('folds a long referrer list rather than growing the panel', async ({ page }) => {
    await stubOverview(page)
    await page.setViewportSize({ width: 1440, height: 1400 })
    await page.goto('/platform')

    const panel = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { level: 2, name: 'Where visitors come from' }) })

    await expect(panel.getByRole('listitem')).toHaveCount(6)
    await expect(panel.getByText('other', { exact: true })).toBeVisible()
  })

  test('never scrolls sideways, at any width', async ({ page }) => {
    await stubOverview(page)

    for (const width of [1440, 1100, 760, 420]) {
      await page.setViewportSize({ width, height: 1200 })
      await page.goto('/platform')
      await expect(page.getByRole('heading', { level: 2, name: 'Traffic' })).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `overflows at ${width}px`).toBeLessThanOrEqual(0)
    }
  })
})
