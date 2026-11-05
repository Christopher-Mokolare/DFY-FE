import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// Staging E2E uses the versioned API route used by the deployed FE client.
const API_BASE_URL = (process.env.DFY_API_URL || 'https://dfy-be-staging.onrender.com/api/v1').replace(/\/$/, '')
const BASE_URL = process.env.BASE_URL || 'https://dfy-fe-staging.onrender.com'
const CREATOR_EMAIL = process.env.DFY_CREATOR_EMAIL
const CREATOR_PASSWORD = process.env.DFY_CREATOR_PASSWORD
const RUNNER_EMAIL = process.env.DFY_RUNNER_EMAIL
const RUNNER_PASSWORD = process.env.DFY_RUNNER_PASSWORD
const ADMIN_EMAIL = process.env.DFY_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.DFY_ADMIN_PASSWORD

test.setTimeout(4 * 60 * 1000)

function requireEnv(name: string, value?: string) {
  if (!value) throw new Error(name + ' GitHub Actions secret is required for this staging E2E.')
  return value
}

async function apiLogin(api: APIRequestContext, email: string, password: string) {
  const response = await api.post(`${API_BASE_URL}/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password },
  })
  expect(response.ok(), `Login failed: HTTP ${response.status()} body=${await response.text()}`).toBeTruthy()
  const body = await response.json()
  expect(body.success, `Login returned success=false for ${email}: ${JSON.stringify(body)}`).toBeTruthy()
  const token = body.token || body.data?.token
  expect(token, `Login response did not contain a token for ${email}: ${JSON.stringify(body)}`).toBeTruthy()
  return String(token)
}

async function useConfiguredCreator(api: APIRequestContext) {
  const email = requireEnv('DFY_CREATOR_EMAIL', CREATOR_EMAIL)
  const password = requireEnv('DFY_CREATOR_PASSWORD', CREATOR_PASSWORD)
  const token = await apiLogin(api, email, password)
  return { email, password, token }
}
async function loginUi(page: Page, email: string, password: string) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/i, { timeout: 30_000 })
}

async function createTask(api: APIRequestContext, creatorToken: string, suffix: string) {
  const taskName = 'DFY Full E2E ' + suffix
  const taskDescription = 'Full DFY staging lifecycle test ' + suffix + ' with Paystack payment, runner completion and confirmation/dispute coverage.'
  const dateNeeded = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

  const create = await api.post(`${API_BASE_URL}/tasks`, {
    headers: { Authorization: 'Bearer ' + creatorToken, 'Content-Type': 'application/json' },
    data: {
      taskName,
      taskDescription,
      category: 'Other',
      area: 'Pretoria',
      priority: 'standard',
      dateNeeded,
      budget: 200,
      notes: 'Full staging lifecycle E2E.',
      termsAccepted: true,
    },
  })
  expect(create.ok(), `Task creation failed: HTTP ${create.status()} body=${await create.text()}`).toBeTruthy()
  const body = await create.json()
  expect(body.success).toBeTruthy()
  const task = body.data?.task
  expect(task).toBeTruthy()
  return { taskId: String(task.taskId), taskName, taskDescription, paymentUrl: String(body.data?.paymentUrl || '') }
}

async function adminVerify(api: APIRequestContext, adminToken: string, taskId: string) {
  const response = await api.patch(`${API_BASE_URL}/admin/tasks/bulk-verify`, {
    headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
    data: { taskIds: [taskId], reason: 'Full DFY staging E2E payment-state setup.' },
  })
  expect(response.ok(), `bulk verify failed: HTTP ${response.status()} body=${await response.text()}`).toBeTruthy()
}

async function claimAndCompleteViaApi(api: APIRequestContext, runnerToken: string, taskId: string) {
  const claim = await api.post(`${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}/claim`, {
    headers: { Authorization: 'Bearer ' + runnerToken, 'Content-Type': 'application/json' },
    data: { helperName: 'DFY E2E Runner', helperContact: '0820000000', termsAccepted: true },
  })
  expect(claim.ok(), `Claim failed: HTTP ${claim.status()} body=${await claim.text()}`).toBeTruthy()

  const complete = await api.post(`${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}/complete`, {
    headers: { Authorization: 'Bearer ' + runnerToken, 'Content-Type': 'application/json' },
    data: {},
  })
  expect(complete.ok(), `Completion failed: HTTP ${complete.status()} body=${await complete.text()}`).toBeTruthy()
}

async function getTask(api: APIRequestContext, token: string, taskId: string) {
  const response = await api.get(`${API_BASE_URL}/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: 'Bearer ' + token },
  })
  expect(response.ok()).toBeTruthy()
  const body = await response.json()
  return body.data
}

async function ensureRunnerBank(api: APIRequestContext, runnerToken: string) {
  const existing = await api.get(`${API_BASE_URL}/banking/accounts`, {
    headers: { Authorization: 'Bearer ' + runnerToken },
  })
  expect(existing.ok(), `Could not check runner payout settings: HTTP ${existing.status()} body=${await existing.text()}`).toBeTruthy()
  const body = await existing.json()
  const accounts = body.data || body.accounts || []
  if (!Array.isArray(accounts) || !accounts.some((account: any) => account.isVerified === true || account.IsVerified === true)) {
    test.skip(true, 'Configure an active, Paystack-verified runner bank account with a recipient reference before running payout lifecycle E2E.')
  }
}

test.describe('DFY escrow and dispute workflow', () => {
  test('admin-verified test payment -> runner completes -> creator confirms -> payout is queued', async ({ page, request }) => {
    // Authenticate the pre-provisioned runner and admin before creating any records.
    // Misconfigured secrets must fail before this E2E leaves a fresh creator behind.
    const runnerToken = await apiLogin(request, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL), requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD))
    await ensureRunnerBank(request, runnerToken)
    const adminToken = await apiLogin(request, requireEnv('DFY_ADMIN_EMAIL', ADMIN_EMAIL), requireEnv('DFY_ADMIN_PASSWORD', ADMIN_PASSWORD))

    const freshCreator = await useConfiguredCreator(request)
    const creatorEmail = freshCreator.email
    const creatorPassword = freshCreator.password
    const creatorToken = freshCreator.token

    const created = await createTask(request, creatorToken, 'CONFIRM-' + Date.now())

    // Verify checkout initialization; this workflow deliberately admin-verifies
    // the payment state instead of completing Paystack Checkout.
    const paymentUrl = await request.get(`${API_BASE_URL}/tasks/${encodeURIComponent(created.taskId)}/payment-url`, {
      headers: { Authorization: 'Bearer ' + creatorToken },
    })
    expect(paymentUrl.ok(), `Paystack payment initialization failed: HTTP ${paymentUrl.status()} body=${await paymentUrl.text()}`).toBeTruthy()
    const paymentBody = await paymentUrl.json()
    const checkoutUrl = paymentBody.data?.paymentUrl
    expect(checkoutUrl).toMatch(/^https:\/\/(checkout\.)?paystack\.com\//i)

    const callback = await request.get(
      `${API_BASE_URL.replace('/api/v1', '')}/api/v1/payment/return?taskId=${encodeURIComponent(created.taskId)}`,
      { maxRedirects: 0 }
    )
    expect(callback.status()).toBe(302)
    expect(callback.headers()['location']).toContain(`/payment/success?taskId=${encodeURIComponent(created.taskId)}`)


    await adminVerify(request, adminToken, created.taskId)

    // Runner accepts and completes through the real UI.
    await loginUi(page, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL), requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD))
    await page.goto('/tasks/browse', { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.getByPlaceholder('Search tasks...').fill(created.taskDescription.split(' ').pop()!)
    await page.getByPlaceholder('Search tasks...').press('Enter')
    const card = page.locator('.task-card').filter({ hasText: created.taskName }).first()
    await expect(card).toBeVisible({ timeout: 30_000 })
    await card.getByRole('button', { name: /accept task/i }).click()
    await expect(page.getByRole('heading', { name: /accept task/i })).toBeVisible()
    await page.getByText(/I agree to the runner terms/i).click()
    await page.getByRole('button', { name: /^Accept Task$/ }).click()
    await expect(page).toHaveURL(/\/tasks\/my-active/, { timeout: 30_000 })
    const active = page.locator('.task-card').filter({ hasText: created.taskDescription }).first()
    await expect(active).toBeVisible({ timeout: 30_000 })
    await active.getByRole('button', { name: /mark as complete/i }).click()
    await page.getByRole('button', { name: /^Mark Complete$/ }).click()

    await expect.poll(async () => String((await getTask(request, creatorToken, created.taskId)).status).toLowerCase())
      .toBe('awaitingconfirmation')

    // Creator confirms via the actual My Posted Tasks UI.
    await loginUi(page, creatorEmail, creatorPassword)
    await page.goto(`/tasks/my-posted?taskId=${encodeURIComponent(created.taskId)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const postedCard = page.locator('#posted-task-' + created.taskId)
    await expect(postedCard).toBeVisible({ timeout: 30_000 })
    await postedCard.getByRole('button', { name: /Confirm & Pay Runner/i }).click()
    await expect(page.getByRole('heading', { name: /Confirm Task Completion/i })).toBeVisible()
    await page.getByRole('button', { name: /Confirm & Release Payout/i }).click()

    await expect.poll(async () => {
      const t = await getTask(request, creatorToken, created.taskId)
      return {
        status: String(t.status).toLowerCase(),
        payment: String(t.paymentStatus || '').toLowerCase(),
        escrow: String(t.escrowStatus || '').toLowerCase(),
      }
    }, { timeout: 30_000, intervals: [1000, 2000, 3000] }).toMatchObject({
      payment: 'escrowreleased',
      escrow: 'released',
    })
  })

  test('runner dispute freezes escrow -> admin resolves dispute -> payout path is re-opened', async ({ browser, page, request }) => {
    // Preflight all existing privileged/test accounts before creating a creator or task.
    const runnerToken = await apiLogin(request, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL), requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD))
    await ensureRunnerBank(request, runnerToken)
    const adminToken = await apiLogin(request, requireEnv('DFY_ADMIN_EMAIL', ADMIN_EMAIL), requireEnv('DFY_ADMIN_PASSWORD', ADMIN_PASSWORD))

    const freshCreator = await useConfiguredCreator(request)
    const creatorToken = freshCreator.token

    const created = await createTask(request, creatorToken, 'DISPUTE-' + Date.now())
    await adminVerify(request, adminToken, created.taskId)
    await claimAndCompleteViaApi(request, runnerToken, created.taskId)

    // Runner raises the dispute through the real Completed Tasks UI.
    const runnerPage = await browser.newPage()
    try {
      await loginUi(runnerPage, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL), requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD))
      await runnerPage.goto(`/tasks/my-completed?taskId=${encodeURIComponent(created.taskId)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      const disputeCard = runnerPage.locator('#completed-task-' + created.taskId)
      await expect(disputeCard).toBeVisible({ timeout: 30_000 })
      await disputeCard.getByRole('button', { name: /Raise Dispute/i }).click()
      await expect(runnerPage.getByRole('heading', { name: /Raise Dispute/i })).toBeVisible()
      await runnerPage.locator('.form-textarea').fill('The delivered work does not match the task requirements; please review before releasing escrow.')
      const disputeResponse = runnerPage.waitForResponse((res) =>
        res.url().includes('/api/v1/disputes') && res.request().method() === 'POST',
        { timeout: 30_000 }
      )
      await runnerPage.locator('.modal-footer').getByRole('button', { name: /Submit Dispute/i }).click()
      const disputeHttp = await disputeResponse
      expect(disputeHttp.ok(), `Dispute submission failed: HTTP ${disputeHttp.status()} body=${await disputeHttp.text()}`).toBeTruthy()
    } finally {
      await runnerPage.close()
    }

    await expect.poll(async () => {
      const t = await getTask(request, creatorToken, created.taskId)
      return { status: String(t.status).toLowerCase(), payment: String(t.paymentStatus).toLowerCase(), escrow: String(t.escrowStatus).toLowerCase() }
    }, { timeout: 30_000, intervals: [1000, 2000] }).toMatchObject({
      status: 'awaitingconfirmation',
      payment: 'disputepending',
      escrow: 'disputed',
    })

    const disputes = await request.get(`${API_BASE_URL}/disputes?status=Open&page=1&pageSize=20`, {
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    expect(disputes.ok()).toBeTruthy()
    const disputeBody = await disputes.json()
    const items = disputeBody.data?.disputes || []
    const dispute = items.find((d: any) => d.taskId === created.taskId)
    expect(dispute).toBeTruthy()

    const resolve = await request.patch(`${API_BASE_URL}/disputes/${dispute.id}/resolve`, {
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      data: {
        action: 'release_to_runner',
        resolution: 'Runner work accepted after admin review.',
        reason: 'Admin E2E resolution: release escrow to runner.',
      },
    })
    expect(resolve.ok(), `dispute resolution failed: HTTP ${resolve.status()} body=${await resolve.text()}`).toBeTruthy()

    await expect.poll(async () => {
      const t = await getTask(request, creatorToken, created.taskId)
      return { payment: String(t.paymentStatus).toLowerCase(), escrow: String(t.escrowStatus).toLowerCase() }
    }, { timeout: 30_000, intervals: [1000, 2000, 3000] }).toMatchObject({
      payment: 'escrowreleased',
      escrow: 'released',
    })
  })
})
