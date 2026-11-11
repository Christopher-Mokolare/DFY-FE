import { generateTotp } from './helpers/totp-auth'
import { test, expect } from '@playwright/test'

const LOGIN = '**/auth/login**'
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-credentials': 'true',
}

function sessionResponse() {
  return {
    success: true,
    message: 'Login successful',
    token: 'eyJhbGciOiJub25lIn0.eyJleHAiOjk5OTk5OTk5OTl9.signature',
    user: {
      id: 9001,
      firstName: 'Test',
      lastName: 'Runner',
      name: 'Test Runner',
      email: 'two-factor@example.test',
      phoneNumber: '0000000000',
      contact: '0000000000',
      userType: 'Runner',
      isVerified: true,
      emailVerified: true,
      profileCompleted: true,
      profileCompletion: 100,
      rating: 0,
      completedTasks: 0,
      createdAt: new Date().toISOString(),
      roles: ['Runner'],
      isAdmin: false,
      canAcceptTasks: false,
      canCreateTasks: false,
    },
  }
}

test('password login presents a dedicated 2FA step and completes after a valid code', async ({ page }) => {
  const submittedCodes: string[] = []

  // Match the API path independent of origin or version prefix; do not let a
  // broad profile mock intercept the password challenge request.
  await page.route('**/*', async route => {
    const requestUrl = new URL(route.request().url())
    if (!requestUrl.pathname.includes('/auth/login')) {
      await route.continue()
      return
    }
    console.log('[2FA UI mock] intercepted', route.request().method(), route.request().url(), route.request().postData())
    // The UI preview and staging API are different origins. Mock the browser's
    // JSON POST preflight as well as the login response so CORS does not hide
    // the intended 401 two-factor challenge from Axios.
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type,authorization',
        },
      })
      return
    }
    const body = route.request().postDataJSON() as { secondFactorCode?: string }
    const code = body.secondFactorCode || ''
    submittedCodes.push(code)

    if (!code) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: CORS_HEADERS,
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
      return
    }

    if (code === '111111') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          requiresTwoFactor: true,
          message: 'The authenticator or recovery code is invalid.',
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
        headers: CORS_HEADERS,
      body: JSON.stringify(sessionResponse()),
    })
  })

  page.on('requestfailed', request => console.log('[2FA UI request failed]', request.method(), request.url(), request.failure()?.errorText))
  page.on('response', response => { if (response.url().includes('/auth/login')) console.log('[2FA UI response]', response.status(), response.url()) })
  await page.goto('/login')
  const emailInput = page.getByPlaceholder('Email Address')
  const passwordInput = page.getByPlaceholder('Password')
  await emailInput.fill('two-factor@example.test')
  await passwordInput.fill('ExamplePassword!123')
  await expect(emailInput).toHaveValue('two-factor@example.test')
  await expect(passwordInput).toHaveValue('ExamplePassword!123')
  const signInButton = page.getByRole('button', { name: 'Sign In', exact: true })
  await expect(signInButton).toBeEnabled()
  await signInButton.click()

  await expect(page.getByRole('heading', { name: 'Verify it's you' })).toBeVisible()
  await expect(page.getByLabel('Authenticator or recovery code')).toBeVisible()
  await expect(page.getByPlaceholder('Email Address')).toHaveCount(0)
  await expect(page.getByPlaceholder('Password')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()

  await page.getByLabel('Authenticator or recovery code').fill('111111')
  await page.getByRole('button', { name: 'Verify and Sign In' }).click()
  await expect(page.getByText('The authenticator or recovery code is invalid.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Verify it's you' })).toBeVisible()

  await page.getByLabel('Authenticator or recovery code').fill('222222')
  await page.getByRole('button', { name: 'Verify and Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 15_000 })
  expect(await page.evaluate(() => localStorage.getItem('token'))).toContain('.')
  expect(submittedCodes).toEqual(['', '111111', '222222'])
})

test('the second-factor field accepts a recovery code without weakening the challenge', async ({ page }) => {
  await page.route(LOGIN, async route => {
    const body = route.request().postDataJSON() as { secondFactorCode?: string }
    if (!body.secondFactorCode) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, requiresTwoFactor: true, message: 'Enter the code from your authenticator app or a recovery code.' }),
      })
      return
    }
    expect(body.secondFactorCode).toBe('AB12-CD34-EF56-7890')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
        headers: CORS_HEADERS,
      body: JSON.stringify(sessionResponse()),
    })
  })

  page.on('requestfailed', request => console.log('[2FA UI request failed]', request.method(), request.url(), request.failure()?.errorText))
  page.on('response', response => { if (response.url().includes('/auth/login')) console.log('[2FA UI response]', response.status(), response.url()) })
  await page.goto('/login')
  await page.getByPlaceholder('Email Address').fill('two-factor@example.test')
  await page.getByPlaceholder('Password').fill('ExamplePassword!123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Verify it's you' })).toBeVisible()
  await page.getByLabel('Authenticator or recovery code').fill('AB12-CD34-EF56-7890')
  await page.getByRole('button', { name: 'Verify and Sign In' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 15_000 })
})

test('TOTP helper matches the RFC 6238 SHA-1 six-digit test vector', () => {
  // RFC 6238 test secret: ASCII "12345678901234567890", Base32 encoded.
  expect(generateTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000)).toBe('287082')
})
