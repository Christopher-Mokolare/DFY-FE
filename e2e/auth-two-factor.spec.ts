import { generateTotp } from './helpers/auth'
import { test, expect } from '@playwright/test'

const PROFILE = '**/api/v1/user/profile'
const LOGIN = '**/auth/login**'

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

  await page.route(PROFILE, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: {} }),
  }))

  await page.route(LOGIN, async route => {
    const body = route.request().postDataJSON() as { secondFactorCode?: string }
    const code = body.secondFactorCode || ''
    submittedCodes.push(code)

    if (!code) {
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
      return
    }

    if (code === '111111') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
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
      body: JSON.stringify(sessionResponse()),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('Email Address').fill('two-factor@example.test')
  await page.getByPlaceholder('Password').fill('ExamplePassword!123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible()
  await expect(page.getByLabel('Authenticator code or recovery code')).toBeVisible()
  await expect(page.getByPlaceholder('Email Address')).toHaveCount(0)
  await expect(page.getByPlaceholder('Password')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()

  await page.getByLabel('Authenticator code or recovery code').fill('111111')
  await page.getByRole('button', { name: 'Verify and sign in' }).click()
  await expect(page.getByText('The authenticator or recovery code is invalid.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible()

  await page.getByLabel('Authenticator code or recovery code').fill('222222')
  await page.getByRole('button', { name: 'Verify and sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 15_000 })
  expect(await page.evaluate(() => localStorage.getItem('token'))).toContain('.')
  expect(submittedCodes).toEqual(['', '111111', '222222'])
})

test('the second-factor field accepts a recovery code without weakening the challenge', async ({ page }) => {
  await page.route(PROFILE, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: {} }),
  }))

  await page.route(LOGIN, async route => {
    const body = route.request().postDataJSON() as { secondFactorCode?: string }
    if (!body.secondFactorCode) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, requiresTwoFactor: true, message: 'Enter the code from your authenticator app or a recovery code.' }),
      })
      return
    }
    expect(body.secondFactorCode).toBe('AB12-CD34-EF56-7890')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionResponse()),
    })
  })

  await page.goto('/login')
  await page.getByPlaceholder('Email Address').fill('two-factor@example.test')
  await page.getByPlaceholder('Password').fill('ExamplePassword!123')
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Two-factor authentication' })).toBeVisible()
  await page.getByLabel('Authenticator code or recovery code').fill('AB12-CD34-EF56-7890')
  await page.getByRole('button', { name: 'Verify and sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:$|\?)/, { timeout: 15_000 })
})

test('TOTP helper matches the RFC 6238 SHA-1 six-digit test vector', () => {
  // RFC 6238 test secret: ASCII "12345678901234567890", Base32 encoded.
  expect(generateTotp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59_000)).toBe('287082')
})
