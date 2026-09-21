  await login(page, email)
  await gotoWithRetry(page, '/browse-errands')
  await expect(page).toHaveURL(/tasks\/browse/i, { timeout: 15_000 })
  await expect(page.locator('main').getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
})

test('poster can access post errand page', async ({ page }) => {
  const email = makeEmail('poster-post')
  await register(page, email, 'creator')
  await login(page, email)
  await gotoWithRetry(page, '/post-errand')
  await expect(page).toHaveURL(/post-errand/i, { timeout: 15_000 })
  await expect(page.locator('main').getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
})

test('poster can view my posted tasks', async ({ page }) => {