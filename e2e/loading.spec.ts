import { expect, test } from './fixtures'

test('never leaves the workbench blank while a screen loads', async ({ signedIn }) => {
  await signedIn.route('**/src/views/SingletonView.vue*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await route.fallback()
  })

  await signedIn.goto('/person')

  await expect(signedIn.locator('main [role="status"]')).toBeVisible({ timeout: 1500 })
  await expect(signedIn.locator('main form')).toBeVisible({ timeout: 10000 })
})

test('shows the skeleton when navigating to a screen still being downloaded', async ({
  signedIn,
}) => {
  await signedIn.goto('/insights')
  await expect(signedIn.locator('main').getByRole('heading', { level: 2 })).toBeVisible()

  await signedIn.route('**/src/views/SingletonView.vue*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2500))
    await route.fallback()
  })

  await signedIn.locator('aside').getByRole('link', { name: 'Person' }).first().click()

  await expect(signedIn).toHaveURL(/\/person/, { timeout: 1500 })
  await expect(signedIn.locator('main [role="status"]')).toBeVisible({ timeout: 1500 })
})
