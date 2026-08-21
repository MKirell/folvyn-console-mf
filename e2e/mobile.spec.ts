import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

const SCREENS = [
  { name: 'workbench', path: '/c/certification' },
  { name: 'entity editor', path: '/c/certification/c1' },
  { name: 'person', path: '/person' },
  { name: 'hero & story', path: '/profile' },
  { name: 'locales', path: '/locales' },
  { name: 'locale queue', path: '/locales/queue/fr' },
  { name: 'media', path: '/media' },
  { name: 'insights', path: '/insights' },
  { name: 'history', path: '/history' },
  { name: 'portfolio', path: '/portfolio' },
  { name: 'legal privacy', path: '/legal/privacy' },
  { name: 'legal terms', path: '/legal/terms' },
]

test.describe('small screens', () => {
  for (const screen of SCREENS) {
    test(`${screen.name} never scrolls the page sideways`, async ({ signedIn }) => {
      await signedIn.goto(screen.path)
      await signedIn.waitForLoadState('networkidle')

      expect(await sidewaysOverflow(signedIn)).toBeLessThanOrEqual(1)
    })
  }

  test('keeps the asset picker readable and inside the viewport', async ({ signedIn }) => {
    await signedIn.goto('/c/certification/c1')
    await signedIn.waitForLoadState('networkidle')

    await signedIn.getByRole('button', { name: 'Choose…' }).first().click()

    const dialog = signedIn.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const heading = dialog.getByRole('heading', { level: 2 })
    await expect(heading).toBeVisible()

    const lines = await heading.evaluate((node) => {
      const style = window.getComputedStyle(node)
      return Math.round(node.getBoundingClientRect().height / parseFloat(style.lineHeight))
    })
    expect(lines).toBe(1)

    expect(await sidewaysOverflow(signedIn)).toBeLessThanOrEqual(1)
  })

  test('opens the command palette from the topbar, with no keyboard', async ({ signedIn }) => {
    await signedIn.goto('/c/certification')
    await signedIn.waitForLoadState('networkidle')

    await signedIn.getByRole('button', { name: 'Show the toolbar' }).click()
    await signedIn.getByRole('button', { name: 'Open command palette' }).click()

    const palette = signedIn.getByRole('dialog', { name: 'Command palette' })
    await expect(palette).toBeVisible()
    await expect(palette.getByRole('textbox')).toBeInViewport()

    await palette.getByRole('textbox').fill('person')
    await expect(palette.getByRole('button').first()).toBeInViewport()

    expect(await sidewaysOverflow(signedIn)).toBeLessThanOrEqual(1)
  })

  test('keeps a confirm dialog and its buttons inside the viewport', async ({ signedIn }) => {
    await signedIn.goto('/c/certification/c1')
    await signedIn.waitForLoadState('networkidle')

    await signedIn.getByRole('button', { name: 'Delete' }).first().click()

    const dialog = signedIn.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeInViewport()
    await expect(dialog.getByRole('textbox')).toBeInViewport()

    expect(await sidewaysOverflow(signedIn)).toBeLessThanOrEqual(1)
  })

  test('keeps the icon browser inside the viewport when expanded', async ({ signedIn }) => {
    await signedIn.goto('/c/certification/c1')
    await signedIn.waitForLoadState('networkidle')

    await signedIn.getByRole('button', { name: 'Browse' }).first().click()

    const icon = signedIn.getByRole('button', { name: 'Award', exact: true }).first()
    await expect(icon).toBeInViewport()

    expect(await sidewaysOverflow(signedIn)).toBeLessThanOrEqual(1)
  })

  test('folds the topbar tools away until they are asked for', async ({ signedIn }) => {
    await signedIn.goto('/c/certification')
    await signedIn.waitForLoadState('networkidle')

    const search = signedIn.getByRole('button', { name: 'Open command palette' })
    await expect(search).toBeHidden()

    await signedIn.getByRole('button', { name: 'Show the toolbar' }).click()
    await expect(search).toBeVisible()
    expect(await sidewaysOverflow(signedIn)).toBeLessThanOrEqual(1)

    await signedIn.getByRole('button', { name: 'Hide the toolbar' }).click()
    await expect(search).toBeHidden()
  })

  test('collapses the rail into a drawer', async ({ signedIn }) => {
    await signedIn.goto('/c/certification')

    const rail = signedIn.getByRole('complementary', { name: 'Console navigation' })
    await expect(rail).not.toBeInViewport()

    await signedIn.getByRole('button', { name: 'Open navigation' }).click()
    await expect(rail).toBeInViewport()

    await signedIn.getByRole('button', { name: 'Close navigation' }).click()
    await expect(rail).not.toBeInViewport()
  })
})
