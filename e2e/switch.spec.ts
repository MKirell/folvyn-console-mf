import { expect, test } from './fixtures'

test('retitles the rail, the topbar and the screen when the language changes', async ({
  signedIn,
}) => {
  await signedIn.goto('/c/volunteering')
  await expect(signedIn.locator('main').getByRole('heading', { level: 2 })).toHaveText(
    'Volunteering',
  )

  const rail = signedIn.locator('aside')
  await expect(rail.getByRole('link', { name: /Skill categories/ })).toBeVisible()
  await expect(rail.getByText('Career', { exact: true })).toBeVisible()

  await signedIn.getByRole('button', { name: 'Edit fr' }).click()

  await expect(signedIn.locator('main').getByRole('heading', { level: 2 })).toHaveText('Bénévolat')
  await expect(rail.getByRole('link', { name: /Compétences/ })).toBeVisible()
  await expect(rail.getByText('Parcours', { exact: true })).toBeVisible()
  await expect(rail.getByRole('link', { name: /Médias/ })).toBeVisible()
  await expect(rail.getByRole('link', { name: /Statistiques/ })).toBeVisible()
  await expect(rail.getByRole('link', { name: /Historique/ })).toBeVisible()
  await expect(signedIn.locator('header h1')).toHaveText('Bénévolat')
})

test('retitles the person editor, its fields and its tabs', async ({ signedIn }) => {
  await signedIn.goto('/person')
  await expect(signedIn.locator('main form')).toBeVisible()

  await expect(signedIn.locator('main').getByRole('heading', { level: 2 }).first()).toHaveText(
    'Person',
  )
  await expect(signedIn.locator('label').filter({ hasText: 'Given name' })).toBeVisible()
  await expect(signedIn.getByRole('tab', { name: 'Fields' })).toBeVisible()

  await signedIn.getByRole('button', { name: 'Edit fr' }).click()

  await expect(signedIn.locator('main').getByRole('heading', { level: 2 }).first()).toHaveText(
    'Identité',
  )
  await expect(signedIn.locator('header h1')).toHaveText('Identité')
  await expect(signedIn.locator('label').filter({ hasText: 'Prénom' })).toBeVisible()
  await expect(signedIn.locator('label').filter({ hasText: 'Paragraphes à propos' })).toBeVisible()
  await expect(signedIn.getByRole('tab', { name: 'Champs' })).toBeVisible()
  await expect(signedIn.locator('label').filter({ hasText: 'Given name' })).toHaveCount(0)
})
