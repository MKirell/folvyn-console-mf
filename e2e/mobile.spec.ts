import { expect, test } from './fixtures'

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

      const overflow = await signedIn.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))

      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    })
  }

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
