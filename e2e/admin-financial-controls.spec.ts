import { generateTotp, getTotpSecretForEmail } from './helpers/auth'
import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://dfy-fe-staging.onrender.com'
const ADMIN_EMAIL = process.env.DFY_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.DFY_ADMIN_PASSWORD

test('admin can inspect financial controls without initiating money movement', async ({ page }) => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Configured DFY admin credentials are required for this staging smoke test.')

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByPlaceholder('Email Address').fill(ADMIN_EMAIL!)
  await page.getByPlaceholder('Password').fill(ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()

  const twoFactorHeading = page.getByRole('heading', { name: /two-factor authentication/i })
  await Promise.race([
    twoFactorHeading.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined),
    page.waitForURL(/dashboard/i, { timeout: 10_000 }).catch(() => undefined),
  ])
  if (await twoFactorHeading.isVisible().catch(() => false)) {
    const totpSecret = getTotpSecretForEmail(ADMIN_EMAIL!)
    if (!totpSecret) {
      throw new Error('The configured admin account requires 2FA. Add its original Base32 enrollment key as DFY_ADMIN_TOTP_SECRET in GitHub Actions.')
    }
    await page.getByLabel('Authenticator code or recovery code').fill(generateTotp(totpSecret))
    await page.getByRole('button', { name: 'Verify and sign in' }).click()
  }
  await expect(page).toHaveURL(/dashboard/i, { timeout: 30_000 })

  await page.goto('/admin/payments', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await expect(page.getByRole('heading', { name: /payments overview/i })).toBeVisible({ timeout: 30_000 })

  await page.getByRole('button', { name: /operations queue/i }).click()
  await expect(page.getByRole('heading', { name: /^payout queue$/i })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('heading', { name: /^refund queue$/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^disputes$/i })).toBeVisible()
  await expect(page.getByText(/chargeback case\/deadline tracking is not yet represented/i)).toBeVisible()

  await expect(page.getByRole('button', { name: /retry payout|issue refund|transfer funds/i })).toHaveCount(0)
})
