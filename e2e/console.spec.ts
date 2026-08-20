import { expect, stubApi, test } from './fixtures'
import type { Page } from '@playwright/test'

const rail = (page: Page) => page.locator('aside')
const main = (page: Page) => page.locator('main')
const heading = (page: Page, name: string | RegExp) =>
  main(page).getByRole('heading', { level: 2, name })
const localeStrip = (page: Page) => page.locator('[aria-label="Editing locale"]')

const pickLocale = async (page: Page, code: string): Promise<void> => {
  await localeStrip(page)
    .getByRole('button', { name: `Edit ${code}` })
    .click()
}

test.describe('sign-in', () => {
  test('sends an anonymous visitor to the login screen', async ({ page, recorder }) => {
    await stubApi(page, recorder)
    await page.goto('/insights')

    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Folvyn Console' })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('lets a signed-in account in no group manage its own portfolio', async ({
    page,
    recorder,
  }) => {
    await stubApi(page, recorder, [])
    await page.addInitScript(() => {
      sessionStorage.setItem('console_refresh_token', 'e2e-refresh-token')
    })

    await page.goto('/insights')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(heading(page, 'Insights')).toBeVisible()
  })

  test('restores an admin session from the refresh token', async ({ signedIn }) => {
    await signedIn.goto('/insights')

    await expect(heading(signedIn, 'Insights')).toBeVisible()
    await expect(rail(signedIn).getByRole('link', { name: /Certifications/ })).toBeVisible()
  })

  test('keeps the console out of search indexes', async ({ page, recorder }) => {
    await stubApi(page, recorder)
    await page.goto('/login')

    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots).toContain('noindex')
  })
})

test.describe('navigation', () => {
  test('groups the sidebar the way the portfolio is organised', async ({ signedIn }) => {
    await signedIn.goto('/insights')

    for (const group of ['Identity', 'Career', 'Education', 'Achievements', 'Workshop']) {
      await expect(rail(signedIn).getByText(group, { exact: true })).toBeVisible()
    }
  })

  test('moves the accent spine to the active entry', async ({ signedIn }) => {
    await signedIn.goto('/insights')
    const spine = rail(signedIn).locator('span.bg-accent').first()
    const before = await spine.getAttribute('style')

    await rail(signedIn)
      .getByRole('link', { name: /Certifications/ })
      .click()
    await expect(heading(signedIn, 'Certifications')).toBeVisible()

    await expect.poll(() => spine.getAttribute('style')).not.toBe(before)
  })

  test('collapses the rail and remembers it across a reload', async ({ signedIn }) => {
    await signedIn.goto('/insights')

    await signedIn.getByRole('button', { name: /collapse navigation/i }).click()
    await expect(rail(signedIn)).toHaveClass(/w-rail-tight/)

    await signedIn.reload()
    await expect(rail(signedIn)).toHaveClass(/w-rail-tight/)
  })

  test('finds an entry by title in the command palette', async ({ signedIn }) => {
    await signedIn.goto('/insights')

    await signedIn.keyboard.press('Control+k')
    await signedIn.getByRole('dialog').getByRole('textbox').fill('DP-900')
    await signedIn.keyboard.press('Enter')

    await expect(signedIn).toHaveURL(/\/c\/certification\/c2/)
  })
})

test.describe('collection workbench', () => {
  test('lists rows with their translation state', async ({ signedIn }) => {
    await signedIn.goto('/c/experience')

    await expect(main(signedIn).getByText('Backend Engineer')).toBeVisible()
    await expect(main(signedIn).getByText('Data Engineer')).toBeVisible()
    await expect(signedIn.getByTitle('2 of 2 translations complete')).toBeVisible()
    await expect(signedIn.getByTitle('1 of 2 translations complete')).toBeVisible()
  })

  test('filters by free text', async ({ signedIn }) => {
    await signedIn.goto('/c/certification')

    await signedIn.getByPlaceholder('Filter…').fill('DP')

    await expect(main(signedIn).getByText('DP-900')).toBeVisible()
    await expect(main(signedIn).getByText('AI-900')).toHaveCount(0)
  })

  test('filters by missing translation', async ({ signedIn }) => {
    await signedIn.goto('/c/experience')

    await signedIn.getByLabel('Filter by missing translation').selectOption('fr')

    await expect(main(signedIn).getByText('Data Engineer')).toBeVisible()
    await expect(main(signedIn).getByText('Backend Engineer')).toHaveCount(0)
  })

  test('asks for a typed confirmation before deleting', async ({ signedIn, recorder }) => {
    await signedIn.goto('/c/certification')

    await main(signedIn).getByRole('button', { name: 'Delete' }).first().click()

    const dialog = signedIn.getByRole('dialog')
    const confirm = dialog.getByRole('button', { name: 'Delete' })
    await expect(confirm).toBeDisabled()

    await dialog.getByRole('textbox').fill('delete')
    await expect(confirm).toBeEnabled()
    await confirm.click()

    await expect
      .poll(() => recorder.calls.filter((call) => call.method === 'DELETE').length)
      .toBe(1)
  })
})

test.describe('entity editor', () => {
  test('edits one locale at a time, switched from the topbar', async ({ signedIn }) => {
    await signedIn.goto('/c/experience/e1')

    await expect(main(signedIn).getByRole('heading', { name: 'Details' })).toBeVisible()
    await expect(main(signedIn).getByText('Shared fields')).toHaveCount(0)

    await pickLocale(signedIn, 'en')
    await expect(main(signedIn).locator('input[value="Backend Engineer"]')).toHaveCount(1)

    await pickLocale(signedIn, 'fr')
    await expect(main(signedIn).locator('input[value="Ingénieur backend"]')).toHaveCount(1)
    await expect(main(signedIn).locator('input[value="Backend Engineer"]')).toHaveCount(0)
  })

  test('renders the real portfolio section inside the preview frame', async ({ signedIn }) => {
    const errors: string[] = []
    signedIn.on('pageerror', (error) => errors.push(String(error)))

    await signedIn.goto('/c/certification/c1')
    await main(signedIn).getByRole('tab', { name: 'Live preview' }).first().click()

    const frame = signedIn.frameLocator('iframe[title="Live preview"]')
    await expect(frame.locator('section#education')).toBeVisible()
    await expect(frame.getByText('AI-900')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('fits the preview to the panel in both viewports', async ({ signedIn }) => {
    await signedIn.goto('/c/certification/c1')
    await main(signedIn).getByRole('tab', { name: 'Live preview' }).first().click()
    await expect(signedIn.locator('iframe[title="Live preview"]')).toBeVisible()

    const measure = () =>
      signedIn.locator('iframe[title="Live preview"]').evaluate((frame: HTMLIFrameElement) => {
        const box = frame.parentElement as HTMLElement
        const host = box.parentElement as HTMLElement
        return {
          overflow: host.scrollWidth - host.clientWidth,
          boxWidth: box.clientWidth,
          boxHeight: box.clientHeight,
          hostWidth: host.clientWidth,
        }
      })

    await expect.poll(async () => (await measure()).boxHeight).toBeGreaterThan(0)
    const desktop = await measure()
    expect(desktop.overflow).toBeLessThanOrEqual(1)
    expect(desktop.boxWidth).toBe(desktop.hostWidth)

    await signedIn.getByRole('button', { name: 'Mobile' }).click()
    await expect.poll(async () => (await measure()).boxWidth).toBe(390)
    const mobile = await measure()
    expect(mobile.overflow).toBeLessThanOrEqual(1)
    expect(mobile.boxHeight).toBeGreaterThan(0)

    await signedIn.getByRole('button', { name: 'Desktop' }).click()
    await expect.poll(async () => (await measure()).boxWidth).toBe(desktop.boxWidth)
  })

  test('renders the preview without pushing the page sideways', async ({ signedIn }) => {
    await signedIn.goto('/c/certification/c1')
    await main(signedIn).getByRole('tab', { name: 'Live preview' }).first().click()

    const overflow = await signedIn.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })

  test('sends only the changed field on save', async ({ signedIn, recorder }) => {
    await signedIn.goto('/c/certification/c1')

    await main(signedIn).getByLabel('Title').fill('AI-900 renewed')
    await signedIn.getByRole('button', { name: /^Save/ }).click()

    await expect(signedIn.getByText('Certification saved')).toBeVisible()

    const patch = recorder.calls.find((call) => call.method === 'PATCH')
    expect(patch?.body).toEqual({ title: 'AI-900 renewed' })
  })

  test('blocks a save that fails validation before any request leaves', async ({
    signedIn,
    recorder,
  }) => {
    await signedIn.goto('/c/certification/new')

    await signedIn.getByRole('button', { name: /^Save/ }).click()

    await expect(
      main(signedIn)
        .getByText(/is required/i)
        .first(),
    ).toBeVisible()
    expect(recorder.calls.filter((call) => call.method === 'POST')).toHaveLength(0)
  })

  test('warns before leaving a screen with unsaved changes', async ({ signedIn }) => {
    await signedIn.goto('/c/certification/c1')
    await main(signedIn).getByLabel('Title').fill('Edited')

    await expect(signedIn.getByText('unsaved')).toBeVisible()

    signedIn.on('dialog', (dialog) => dialog.dismiss())
    await rail(signedIn)
      .getByRole('link', { name: /Projects/ })
      .click()

    await expect(signedIn).toHaveURL(/\/c\/certification\/c1/)
  })

  test('saves with the keyboard shortcut', async ({ signedIn, recorder }) => {
    await signedIn.goto('/c/certification/c1')

    await main(signedIn).getByLabel('Issuer').fill('Microsoft Learn')
    await signedIn.keyboard.press('Control+s')

    await expect(signedIn.getByText('Certification saved')).toBeVisible()
    expect(recorder.calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      issuer: 'Microsoft Learn',
    })
  })
})

test.describe('locales and media', () => {
  test('shows a work queue that front-loads the foundation', async ({ signedIn }) => {
    await signedIn.goto('/locales/queue/fr')

    await expect(main(signedIn).getByRole('heading', { name: 'Foundation' })).toBeVisible()
    await expect(main(signedIn).getByText('Hero', { exact: true })).toBeVisible()
    await expect(main(signedIn).getByRole('heading', { name: 'Experiences' })).toBeVisible()
    await expect(main(signedIn).getByRole('heading', { name: 'Certifications' })).toHaveCount(0)
  })

  test('reports the locale that has no hero narrative yet', async ({ signedIn }) => {
    await signedIn.goto('/locales/queue/fr')

    await expect(
      main(signedIn).getByText(/nothing below the foundation renders/i),
    ).toBeVisible()
  })

  test('flags referenced files the bucket does not have', async ({ signedIn }) => {
    await signedIn.goto('/media')

    await expect(main(signedIn).getByText(/referenced file/i)).toBeVisible()
    await expect(main(signedIn).getByText('certificate-azure-ai900.pdf')).toBeVisible()
  })

  test('states plainly that analytics are not live yet', async ({ signedIn }) => {
    await signedIn.goto('/insights')

    await expect(main(signedIn).getByText(/no analytics yet/i)).toBeVisible()
  })
})

test.describe('affordances', () => {
  test('every enabled button shows a pointer, disabled ones do not', async ({ signedIn }) => {
    await signedIn.goto('/c/certification/c1')

    const enabled = await signedIn
      .locator('button:not([disabled])')
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node as HTMLElement).cursor))

    expect(enabled.length).toBeGreaterThan(3)
    expect(new Set(enabled)).toEqual(new Set(['pointer']))

    const disabled = await signedIn
      .locator('button[disabled]')
      .first()
      .evaluate((node) => getComputedStyle(node as HTMLElement).cursor)

    expect(disabled).not.toBe('pointer')
  })
})

test.describe('theme', () => {
  test('switches theme and keeps it across a reload', async ({ signedIn }) => {
    await signedIn.goto('/insights')

    const before = await signedIn.locator('html').getAttribute('class')
    await rail(signedIn)
      .getByRole('button', { name: /switch to (dark|light) theme/i })
      .click()
    const after = await signedIn.locator('html').getAttribute('class')

    expect(after).not.toBe(before)

    await signedIn.reload()
    await expect(signedIn.locator('html')).toHaveClass(after as string)
  })
})
