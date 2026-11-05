/**
 * E2E: Complete runner ↔ creator lifecycle
 *
 * Credentials are supplied through CI environment variables / GitHub Secrets.
 *
 * Flow:
 *   1. Creator posts a task (API)
 *   2. Admin bulk-verifies the task (simulates Paystack webhook)
 *   3. Runner browses → finds task → accepts via UI
 *   4. Runner navigates to My Active Tasks → marks task complete via UI
 *   5. Creator navigates to My Posted Tasks → confirms completion via UI
 *   6. Assert task reaches EscrowReleased / payout-queued state
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

const API  = (process.env.DFY_API_URL  || 'https://dfy-be-staging.onrender.com/api/v1').replace(/\/$/, '')
const BASE = process.env.BASE_URL       || 'https://dfy-fe-staging.onrender.com'

const RUNNER_EMAIL = process.env.DFY_RUNNER_EMAIL
const RUNNER_PASSWORD = process.env.DFY_RUNNER_PASSWORD
const CREATOR_EMAIL = process.env.DFY_CREATOR_EMAIL
const CREATOR_PASSWORD = process.env.DFY_CREATOR_PASSWORD
const ADMIN_EMAIL = process.env.DFY_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.DFY_ADMIN_PASSWORD

test.setTimeout(6 * 60 * 1000)

// ─── helpers ────────────────────────────────────────────────────────────────

function requireEnv(name: string, value?: string): string {
  if (!value) throw new Error(`${name} is required for this staging E2E.`)
  return value
}

async function apiLogin(api: APIRequestContext, email: string, password: string): Promise<string> {
  const res  = await api.post(`${API}/auth/login`, { data: { email, password } })
  const body = await res.json()
  expect(
    res.ok() && body.success !== false,
    `Login failed for configured test account: HTTP ${res.status()} response=${JSON.stringify(body)}. Verify the matching DFY_* GitHub Actions secrets and that the account exists in the staging database.`,
  ).toBeTruthy()
  const token = body.token ?? body.data?.token
  expect(token, `Login succeeded without a token: ${JSON.stringify(body)}`).toBeTruthy()
  return String(token)
}

async function loginUi(page: Page, email: string, password: string) {
  // Open the login route, clear any stale browser auth, then navigate afresh.
  // Reloading here can race with the SPA's auth redirect and abort the frame.
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/i, { timeout: 30_000 })
}

async function createTask(api: APIRequestContext, token: string): Promise<{ taskId: string; label: string }> {
  const label = `Runner-Creator E2E ${Date.now()}`
  const res = await api.post(`${API}/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      taskName: label,
      taskDescription: label + ' – automated lifecycle test.',
      category: 'Other',
      area: 'Johannesburg',
      priority: 'standard',
      dateNeeded: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      budget: 150,
      notes: 'Automated E2E – safe to ignore.',
      termsAccepted: true,
    },
  })
  const body = await res.json()
  let taskId = String(body.data?.task?.taskId ?? '')
  if (res.status() === 502) {
    const posted = await api.get(`${API}/tasks/my-posted?page=1&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(posted.ok(), `Could not recover task after checkout initialization failure: ${posted.status()} ${await posted.text()}`).toBeTruthy()
    const postedBody = await posted.json()
    const tasks = postedBody.data?.tasks ?? postedBody.data?.Tasks ?? []
    taskId = String(tasks.find((task: any) => task.taskName === label)?.taskId ?? '')
  } else {
    expect(res.ok(), `Task creation failed: ${res.status()} ${JSON.stringify(body)}`).toBeTruthy()
    expect(body.success, 'Task creation success=false').toBeTruthy()
  }

  expect(taskId).toMatch(/^DFY-/)
  return { taskId, label }
}

async function adminVerify(api: APIRequestContext, token: string, taskId: string) {
  const res = await api.patch(`${API}/admin/tasks/bulk-verify`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { taskIds: [taskId], reason: 'Runner-Creator E2E payment simulation.' },
  })
  expect(res.ok(), `Admin verify failed: ${res.status()} ${await res.text()}`).toBeTruthy()
}

async function pollTask(api: APIRequestContext, token: string, taskId: string) {
  const res = await api.get(`${API}/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(res.ok()).toBeTruthy()
  return (await res.json()).data
}

async function ensureRunnerHasVerifiedBank(api: APIRequestContext, token: string) {
  const res = await api.get(`${API}/banking/accounts`, { headers: { Authorization: `Bearer ${token}` } })
  expect(res.ok()).toBeTruthy()
  const accounts: any[] = (await res.json()).data ?? []
  const verified = accounts.some(a => a.isVerified === true && a.isActive !== false)
  if (!verified) {
    test.skip(true, 'Runner has no verified Paystack bank account – add one in Payout Settings first.')
  }
}

// ─── test ───────────────────────────────────────────────────────────────────

test('runner accepts task → marks complete → creator confirms → payout queued', async ({ page, request }) => {
  const runnerEmail = requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL)
  const runnerPassword = requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD)
  const creatorEmail = requireEnv('DFY_CREATOR_EMAIL', CREATOR_EMAIL)
  const creatorPassword = requireEnv('DFY_CREATOR_PASSWORD', CREATOR_PASSWORD)
  const adminEmail = requireEnv('DFY_ADMIN_EMAIL', ADMIN_EMAIL)
  const adminPassword = requireEnv('DFY_ADMIN_PASSWORD', ADMIN_PASSWORD)

  // 1. Authenticate all three parties.
  const runnerToken  = await apiLogin(request, runnerEmail, runnerPassword)
  const creatorToken = await apiLogin(request, creatorEmail, creatorPassword)
  const adminToken   = await apiLogin(request, adminEmail, adminPassword)

  // 2. Confirm runner has a verified payout bank account.
  await ensureRunnerHasVerifiedBank(request, runnerToken)

  // 3. Creator posts a task via API.
  const { taskId, label } = await createTask(request, creatorToken)

  // Admin simulates Paystack payment (bulk-verify → EscrowHeld / Posted).
  await adminVerify(request, adminToken, taskId)

  await expect.poll(
    async () => String((await pollTask(request, creatorToken, taskId)).status).toLowerCase(),
    { timeout: 20_000, intervals: [1000, 2000] },
  ).toBe('posted')

  // ── RUNNER UI ──────────────────────────────────────────────────────────────

  // 6. Runner logs in and browses for the task.
  await loginUi(page, runnerEmail, runnerPassword)
  await page.goto(`${BASE}/tasks/browse`, { waitUntil: 'domcontentloaded', timeout: 60_000 })

  // Search by the unique label suffix so we find exactly this task.
  const searchTerm = label.split(' ').pop()!
  await page.getByPlaceholder('Search tasks...').fill(searchTerm)
  await page.getByPlaceholder('Search tasks...').press('Enter')

  const taskCard = page.locator('.task-card').filter({ hasText: label }).first()
  await expect(taskCard).toBeVisible({ timeout: 30_000 })

  // 7. Runner opens the accept modal and accepts.
  await taskCard.getByRole('button', { name: /accept task/i }).click()
  await expect(page.getByRole('heading', { name: /accept task/i })).toBeVisible({ timeout: 10_000 })
  await page.getByText(/I agree to the runner terms/i).click()
  await page.getByRole('button', { name: /^Accept Task$/ }).click()

  // Should redirect to My Active Tasks.
  await expect(page).toHaveURL(/\/tasks\/my-active/, { timeout: 30_000 })

  // 8. Confirm task appears in My Active Tasks.
  const activeCard = page.locator('.task-card').filter({ hasText: label }).first()
  await expect(activeCard).toBeVisible({ timeout: 30_000 })

  // 9. Runner marks the task as complete.
  await activeCard.getByRole('button', { name: /mark as complete/i }).click()
  await expect(page.getByRole('heading', { name: /mark task complete/i })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /^Mark Complete$/ }).click()

  // 10. Poll until task reaches AwaitingConfirmation.
  await expect.poll(
    async () => String((await pollTask(request, creatorToken, taskId)).status).toLowerCase(),
    { timeout: 30_000, intervals: [1000, 2000, 3000] },
  ).toBe('awaitingconfirmation')

  // ── CREATOR UI ─────────────────────────────────────────────────────────────

  // 11. Creator logs in and navigates directly to the task card.
  await loginUi(page, creatorEmail, creatorPassword)
  await page.goto(
    `${BASE}/tasks/my-posted?taskId=${encodeURIComponent(taskId)}&action=confirm`,
    { waitUntil: 'domcontentloaded', timeout: 60_000 },
  )

  // The ?action=confirm deep-link auto-opens the confirm modal — wait for it.
  const confirmHeading = page.getByRole('heading', { name: /confirm task completion/i })
  await expect(confirmHeading).toBeVisible({ timeout: 30_000 })

  // 12. Creator releases the payout (button is inside the modal).
  await page.locator('.modal-box').getByRole('button', { name: /confirm & release payout/i }).click()

  // 13. Assert escrow is released and payout is queued.
  await expect.poll(
    async () => {
      const t = await pollTask(request, creatorToken, taskId)
      return {
        payment: String(t.paymentStatus ?? '').toLowerCase(),
        escrow:  String(t.escrowStatus  ?? '').toLowerCase(),
      }
    },
    { timeout: 30_000, intervals: [1000, 2000, 3000] },
  ).toMatchObject({
    payment: 'escrowreleased',
    escrow:  'released',
  })

  // 14. Confirm the task card is no longer in "Awaiting Confirmation" on the creator's UI.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 })
  const completedCard = page.locator(`#posted-task-${taskId}`)
  if (await completedCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await expect(completedCard).not.toContainText('AwaitingConfirmation')
  }
})
