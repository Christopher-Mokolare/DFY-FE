import { test, expect, type Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://dfy-fe-staging.onrender.com'
const CREATOR_EMAIL = process.env.DFY_CREATOR_EMAIL
const CREATOR_PASSWORD = process.env.DFY_CREATOR_PASSWORD
const ADMIN_EMAIL = process.env.DFY_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.DFY_ADMIN_PASSWORD

if (!CREATOR_EMAIL || !CREATOR_PASSWORD || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error('Missing DFY_CREATOR_EMAIL/DFY_CREATOR_PASSWORD or DFY_ADMIN_EMAIL/DFY_ADMIN_PASSWORD.')
}

const tasks = [
  ['Urgent grocery run for the week', 'Please collect the weekly groceries and deliver them to the specified address.', 175],
  ['Collect groceries from the local supermarket', 'Collect a prepaid grocery order and deliver it safely.', 200],
  ['Pick up household supplies', 'Pick up a small household-supplies order and bring it to the requester.', 225],
  ['Deliver a small grocery order', 'Collect and deliver a small grocery order within the local area.', 250],
  ['Collect and deliver essential items', 'Collect essential household items and deliver them to the requester.', 275],
] as const

function futureDate(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/auth/login') && r.request().method() === 'POST'),
    page.getByRole('button', { name: /sign in/i }).click(),
  ])
  await expect(page).toHaveURL(/dashboard|admin/i, { timeout: 30_000 })
}

async function createTask(page: Page, taskName: string, description: string, budget: number, days: number) {
  await page.goto(`${BASE_URL}/tasks/post`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  // The real application redirects to Ozow after task creation. Abort only that
  // external navigation; the task creation request itself is still exercised.
  await page.route('**/*', async route => {
    const url = route.request().url()
    if (/^https:\/\/([a-z0-9-]+\.)*ozow\.com\//i.test(url)) return route.abort()
    return route.continue()
  })

  await page.locator('input[placeholder*="e.g."]').fill(taskName)
  await page.locator('textarea[placeholder*="Tell us what you need"]').fill(description)
  await page.locator('select').first().selectOption({ label: 'Grocery Shopping' })
  await page.getByPlaceholder('Area / Suburb').fill('Johannesburg')
  await page.locator('input[type="radio"][value="standard"]').check()

  // Confirm the real Step 1 form accepted every required value before advancing.
  await expect(page.locator('input[placeholder*="e.g."]')).toHaveValue(taskName)
  await expect(page.locator('textarea[placeholder*="Tell us what you need"]')).toHaveValue(description)
  await expect(page.locator('select').first()).toHaveValue('Grocery Shopping')
  await expect(page.getByPlaceholder('Area / Suburb')).toHaveValue('Johannesburg')
  await expect(page.locator('input[type="radio"][value="standard"]')).toBeChecked()

  const stepOneNext = page.getByRole('button', { name: /^Next$/i }).first()
  await expect(stepOneNext).toBeEnabled({ timeout: 10_000 })
  await stepOneNext.click()

  await page.locator('input[type="datetime-local"]').fill(futureDate(days))
  await page.locator('input[type="number"]').fill(String(budget))
  await page.getByRole('button', { name: /^Next$/i }).click()

  await page.locator('input[type="checkbox"]').check()
  const createResponse = page.waitForResponse(
    r => r.url().includes('/tasks') && r.request().method() === 'POST',
    { timeout: 30_000 }
  )
  await page.getByRole('button', { name: /continue to ozow/i }).click()
  const response = await createResponse

  // A payment-provider response can be 502 on staging while the task has already
  // been persisted. Verify the task exists through the creator's My Posted page.
  await page.goto(`${BASE_URL}/tasks/my-posted`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await expect(page.getByText(taskName, { exact: true })).toBeVisible({ timeout: 30_000 })

  return response.status()
}

async function verifyTask(page: Page, taskName: string) {
  await page.goto(`${BASE_URL}/admin/tasks`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const search = page.getByPlaceholder('Search tasks...')
  await search.fill(taskName)
  await page.waitForTimeout(700)

  const cardOrRow = page.getByText(taskName, { exact: true }).first()
  await expect(cardOrRow).toBeVisible({ timeout: 30_000 })

  const container = cardOrRow.locator('xpath=ancestor::tr[1]')
  const row = (await container.count()) ? container : cardOrRow.locator('xpath=ancestor::div[contains(@class,"admin-task-card")][1]')
  const verifyButton = row.getByRole('button', { name: /^verify$/i }).first()
  await expect(verifyButton).toBeVisible({ timeout: 10_000 })

  page.once('dialog', async dialog => {
    await dialog.accept('Staging mobile Browse Tasks test data')
  })
  await verifyButton.click()
  await expect(verifyButton).toHaveCount(0, { timeout: 30_000 })
}

test('seed five real staging Browse Tasks through Playwright', async ({ page }) => {
  await login(page, CREATOR_EMAIL!, CREATOR_PASSWORD!)

  const statuses: number[] = []
  for (let i = 0; i < tasks.length; i++) {
    statuses.push(await createTask(page, tasks[i][0], tasks[i][1], tasks[i][2], i + 1))
  }

  await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  for (const [name] of tasks) {
    await verifyTask(page, name)
  }

  await login(page, CREATOR_EMAIL!, CREATOR_PASSWORD!)
  await page.goto(`${BASE_URL}/tasks/browse`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  for (const [name] of tasks) {
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 30_000 })
  }

  expect(statuses).toHaveLength(5)
  console.log('DFY STAGING PLAYWRIGHT SEED COMPLETE: 5/5 tasks created, verified, and visible in Browse Tasks.')
})
