import { test, expect, type Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://dfy-fe-staging.onrender.com'
const EMAIL = process.env.DFY_REG_EMAIL || 'obakengchrismokolare@gmail.com'
const PASSWORD = process.env.DFY_REG_PASSWORD
const FIRST_NAME = process.env.DFY_REG_FIRST_NAME || 'Obakeng'
const LAST_NAME = process.env.DFY_REG_LAST_NAME || 'Mokolare'
const ID_NUMBER = process.env.DFY_REG_ID_NUMBER
const PHONE = process.env.DFY_REG_PHONE || '0694690235'
const ADDRESS = process.env.DFY_REG_ADDRESS || 'Rustenburg'

test.setTimeout(120_000)

function requireEnv(name: string, value?: string) {
  if (!value) throw new Error(name + ' is required.')
  return value
}

async function fillRegistration(page: Page, password: string) {
  await page.goto(BASE_URL + '/register', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByPlaceholder('First Name *').fill(FIRST_NAME)
  await page.getByPlaceholder('Last Name *').fill(LAST_NAME)
  await page.getByPlaceholder('Email Address *').fill(EMAIL)
  await page.getByPlaceholder('Phone Number *').fill(PHONE)
  await page.getByRole('button', { name: /continue/i }).click()

  const creatorRoleCard = page.locator('label.role-card').filter({ hasText: 'Task Creator' }).first()
  await expect(creatorRoleCard).toBeVisible()
  await creatorRoleCard.click()
  const creatorRole = page.locator('input[name="userType"][value="creator"]')
  await expect(creatorRole).toBeChecked()
  await page.getByPlaceholder('ID Number *').fill(ID_NUMBER!)
  await expect(page.locator('input[type="date"]')).toHaveValue(/^1993-02-22$/)
  await page.getByPlaceholder('Address *').fill(ADDRESS)
  const detailsContinue = page.getByRole('button', { name: /^Continue$/ })
  await expect(detailsContinue).toBeEnabled({ timeout: 10_000 })
  await detailsContinue.click()

  await page.getByPlaceholder('Password *').fill(password)
  await page.getByPlaceholder('Confirm Password *').fill(password)
  await page.getByRole('button', { name: /create account/i }).click()
}

async function login(page: Page, password: string) {
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByPlaceholder('Email Address').fill(EMAIL)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
}

test('register and verify DFY creator account', async ({ page }) => {
  const password = requireEnv('DFY_REG_PASSWORD', PASSWORD)
  const idNumber = requireEnv('DFY_REG_ID_NUMBER', ID_NUMBER)

  await fillRegistration(page, password)

  const currentUrl = page.url()
  const registrationError = page.locator('.alert-error')

  if (/\/login/i.test(currentUrl)) {
    // Registration succeeded and the app redirected to login.
    await expect(page).toHaveURL(/\/login/i)
  } else if (await registrationError.count() && await registrationError.first().isVisible()) {
    const message = (await registrationError.first().innerText()).trim()
    if (!/already|exists|registered/i.test(message)) throw new Error('Registration failed: ' + message)
    // Safe rerun path: the account already exists.
    await login(page, password)
  } else {
    throw new Error('Registration did not reach login and no recoverable duplicate-account message was shown.')
  }

  if (/\/login/i.test(page.url())) {
    await login(page, password)
  }

  await expect(page).toHaveURL(/\/dashboard/i, { timeout: 30_000 })
  console.log(`Verified DFY creator account: ${EMAIL} (ID ${idNumber.slice(0, 6)}*******)`)
})
