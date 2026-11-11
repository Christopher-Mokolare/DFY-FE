import { test, expect } from '@playwright/test'

test('keeps the login page mounted and shows the backend 2FA challenge', async ({ page }) => {
  await page.route('**/auth/login', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        requiresTwoFactor: true,
        requiresAccountSetup: false,
        requiresAccountLink: false,
        token: null,
        user: null,
        message: 'Enter the code from your authenticator app or a recovery code.',
      }),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('Email Address').fill('two-factor-regression@example.invalid')
  await page.getByPlaceholder('Password').fill('NotARealPassword123!')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()

  await expect(page.getByRole('heading', { name: "Verify it's you" })).toBeVisible()
  await expect(page.locator('#second-factor-code')).toBeVisible()
  await expect(page.getByText('Your password was accepted. Complete the second step', { exact: false })).toBeVisible()
})
