import { test, expect } from '@playwright/test'

// This regression must exercise the PR's built frontend, not the separately
// deployed staging FE. The workflow starts Vite preview on this local URL.
test.use({ baseURL: 'http://127.0.0.1:4173' })

test('keeps the login page mounted and shows the backend 2FA challenge', async ({ page }) => {
  let interceptedLogin = false

  await page.route('**/auth/login**', async route => {
    interceptedLogin = true
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

  const email = page.getByPlaceholder('Email Address')
  const password = page.getByPlaceholder('Password')
  await email.fill('two-factor-regression@example.invalid')
  await password.fill('NotARealPassword123!')
  await expect(email).toHaveValue('two-factor-regression@example.invalid')
  await expect(password).toHaveValue('NotARealPassword123!')

  const signIn = page.getByRole('button', { name: 'Sign In', exact: true })
  await expect(signIn).toBeEnabled()

  const challengeResponse = page.waitForResponse(response =>
    response.url().includes('/auth/login') && response.status() === 401
  )
  await signIn.click()
  await challengeResponse
  expect(interceptedLogin).toBe(true)

  await expect(page.getByRole('heading', { name: "Verify it's you" })).toBeVisible()
  await expect(page.locator('#second-factor-code')).toBeVisible()
  await expect(page.getByText('Your sign-in details were accepted', { exact: false })).toBeVisible()
})
