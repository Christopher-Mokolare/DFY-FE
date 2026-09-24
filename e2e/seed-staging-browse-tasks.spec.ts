import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'https://dfy-fe-staging.onrender.com'
const API_BASE_URL = (process.env.DFY_API_URL || 'https://dfy-be-staging.onrender.com/api/v1').replace(/\/$/, '')
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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00.000Z`
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

async function token(page: Page) {
  const value = await page.evaluate(() => localStorage.getItem('token'))
  if (!value) throw new Error('Authenticated browser session did not contain a token.')
  return value
}

async function postedTasks(api: APIRequestContext, authToken: string) {
  const response = await api.get(`${API_BASE_URL}/tasks/my-posted?page=1&pageSize=100`, {
    headers: { Authorization: `Bearer ${authToken}` },
  })
  if (!response.ok()) throw new Error(`My Posted request failed: ${response.status()} ${await response.text()}`)
  const body = await response.json()
  return Array.isArray(body) ? body : body?.data?.tasks || body?.data || body?.tasks || body?.items || []
}

async function createTask(
  page: Page,
  api: APIRequestContext,
  taskName: string,
  description: string,
  budget: number,
  days: number,
) {
  const authToken = await token(page)
  const existing = await postedTasks(api, authToken)
  const existingTask = existing.find((item: any) => item?.taskName === taskName)

  if (existingTask) {
    return String(existingTask.taskId || existingTask.id)
  }

  // Use the same authenticated /tasks endpoint as the application, but do not
  // drive the form. The form's React state is not part of what this seed needs
  // to prove, and previously caused a false timeout before the API was reached.
  // The backend persists the task before attempting the Ozow payment request.
  const response = await api.post(`${API_BASE_URL}/tasks`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      taskName,
      taskDescription: description,
      category: 'Grocery Shopping',
      area: 'Johannesburg',
      priority: 'Standard',
      dateNeeded: futureDate(days),
      budget,
      notes: 'Staging Playwright seed data for mobile Browse Tasks testing.',
      termsAccepted: true,
    },
  })

  if (![200, 502].includes(response.status())) {
    throw new Error(`Task creation failed for "${taskName}": ${response.status()} ${await response.text()}`)
  }

  // A 502 can be returned when the staging Ozow call fails after the task has
  // already been persisted. Recover the persisted task from My Posted instead
  // of treating the payment-provider response as task-creation failure.
  const created = await postedTasks(api, authToken)
  const task = created.find((item: any) => item?.taskName === taskName)
  const taskId = task?.taskId || task?.id
  if (!taskId) {
    throw new Error(`Task "${taskName}" was not persisted. Create response: ${await response.text()}`)
  }

  return String(taskId)
}

async function verifyTask(page: Page, api: APIRequestContext, taskName: string, taskId: string) {
  const adminToken = await token(page)

  const response = await api.patch(`${API_BASE_URL}/admin/tasks/${taskId}/verify`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    data: { reason: 'Staging mobile Browse Tasks test data' },
  })

  if (![200, 204].includes(response.status())) {
    throw new Error(`Verification failed for "${taskName}": ${response.status()} ${await response.text()}`)
  }

  await page.goto(`${BASE_URL}/admin/tasks`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const search = page.getByPlaceholder('Search tasks...')
  await search.fill(taskName)
  await page.waitForTimeout(700)
  await expect(page.getByText(taskName, { exact: true }).first()).toBeVisible({ timeout: 30_000 })
}

test('seed five real staging Browse Tasks through the authenticated API and verify in UI', async ({ page, request }) => {
  await login(page, CREATOR_EMAIL!, CREATOR_PASSWORD!)

  const taskIds: string[] = []
  for (let i = 0; i < tasks.length; i++) {
    taskIds.push(await createTask(page, request, tasks[i][0], tasks[i][1], tasks[i][2], i + 1))
  }

  await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!)
  for (let i = 0; i < tasks.length; i++) {
    await verifyTask(page, request, tasks[i][0], taskIds[i])
  }

  await login(page, CREATOR_EMAIL!, CREATOR_PASSWORD!)
  await page.goto(`${BASE_URL}/tasks/browse`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  for (const [name] of tasks) {
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 30_000 })
  }

  console.log('DFY STAGING PLAYWRIGHT SEED COMPLETE: 5/5 tasks created, verified, and visible in Browse Tasks.')
})
