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

type AuthenticatedSession = { token: string; user: unknown }
const authenticatedSessions = new Map<string, AuthenticatedSession>()

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
  const user = body.user || body.data?.user
  expect(token, `Login response did not contain a token for ${email}: ${JSON.stringify(body)}`).toBeTruthy()
  expect(user, `Login response did not contain a user profile for ${email}.`).toBeTruthy()
  authenticatedSessions.set(email, { token: String(token), user })
  return String(token)
}

async function useConfiguredCreator(api: APIRequestContext) {
  const email = requireEnv('DFY_CREATOR_EMAIL', CREATOR_EMAIL)
  const password = requireEnv('DFY_CREATOR_PASSWORD', CREATOR_PASSWORD)
  const token = await apiLogin(api, email, password)
  return { email, password, token }
}
async function loginUi(page: Page, email: string) {
  const session = authenticatedSessions.get(email)
  expect(session, `No preflight-authenticated browser session is available for ${email}.`).toBeTruthy()
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }, session!)
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
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
    await loginUi(page, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL))
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
    await loginUi(page, creatorEmail)
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

  test('creator completion dispute freezes escrow -> admin resolves -> payout path is re-opened', async ({ browser, page, request }) => {
    const runnerToken = await apiLogin(request, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL), requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD))
    await ensureRunnerBank(request, runnerToken)
    const adminToken = await apiLogin(request, requireEnv('DFY_ADMIN_EMAIL', ADMIN_EMAIL), requireEnv('DFY_ADMIN_PASSWORD', ADMIN_PASSWORD))
    const freshCreator = await useConfiguredCreator(request)
    const creatorToken = freshCreator.token

    const created = await createTask(request, creatorToken, 'CREATOR-DISPUTE-' + Date.now())
    await adminVerify(request, adminToken, created.taskId)
    await claimAndCompleteViaApi(request, runnerToken, created.taskId)

    await loginUi(page, freshCreator.email)
    await page.goto(`/tasks/my-posted?taskId=${encodeURIComponent(created.taskId)}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const taskCard = page.locator('#posted-task-' + created.taskId)
    await expect(taskCard).toBeVisible({ timeout: 30_000 })
    await taskCard.getByRole('button', { name: /Raise completion dispute/i }).click()
    await expect(page.getByRole('heading', { name: /Dispute Completion/i })).toBeVisible()
    await page.locator('.modal-box .form-textarea').fill('The delivered work does not match the agreed task requirements. Please review the work before releasing escrow.')
    const disputeResponse = page.waitForResponse(res =>
      res.url().includes('/api/v1/disputes') && res.request().method() === 'POST',
      { timeout: 30_000 }
    )
    await page.locator('.modal-footer').getByRole('button', { name: /Submit dispute/i }).click()
    const disputeHttp = await disputeResponse
    expect(disputeHttp.ok(), `Creator dispute submission failed: HTTP ${disputeHttp.status()} body=${await disputeHttp.text()}`).toBeTruthy()

    await expect.poll(async () => {
      const task = await getTask(request, creatorToken, created.taskId)
      return { payment: String(task.paymentStatus || '').toLowerCase(), escrow: String(task.escrowStatus || '').toLowerCase() }
    }, { timeout: 30_000, intervals: [1000, 2000] }).toMatchObject({
      payment: 'disputepending',
      escrow: 'disputed',
    })

    const disputes = await request.get(`${API_BASE_URL}/disputes?status=Open&page=1&pageSize=20`, {
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    expect(disputes.ok()).toBeTruthy()
    const disputeBody = await disputes.json()
    const items = disputeBody.data?.disputes || []
    const dispute = items.find((item: any) => item.taskId === created.taskId)
    expect(dispute).toBeTruthy()

    const resolve = await request.patch(`${API_BASE_URL}/disputes/${dispute.id}/resolve`, {
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      data: {
        action: 'release_to_runner',
        resolution: 'Creator completion dispute reviewed; work accepted.',
        reason: 'Admin E2E resolution: release escrow to runner.',
      },
    })
    expect(resolve.ok(), `Dispute resolution failed: HTTP ${resolve.status()} body=${await resolve.text()}`).toBeTruthy()

    await expect.poll(async () => {
      const task = await getTask(request, creatorToken, created.taskId)
      return { payment: String(task.paymentStatus || '').toLowerCase(), escrow: String(task.escrowStatus || '').toLowerCase() }
    }, { timeout: 30_000, intervals: [1000, 2000, 3000] }).toMatchObject({
      payment: 'escrowreleased',
      escrow: 'released',
    })
  })

  test('runner reports a Chat Hub incident with message evidence without freezing escrow', async ({ browser, page, request }) => {
    const runnerToken = await apiLogin(request, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL), requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD))
    const adminToken = await apiLogin(request, requireEnv('DFY_ADMIN_EMAIL', ADMIN_EMAIL), requireEnv('DFY_ADMIN_PASSWORD', ADMIN_PASSWORD))
    const freshCreator = await useConfiguredCreator(request)
    const creatorToken = freshCreator.token

    const created = await createTask(request, creatorToken, 'RUNNER-INCIDENT-' + Date.now())
    await adminVerify(request, adminToken, created.taskId)
    await claimAndCompleteViaApi(request, runnerToken, created.taskId)

    const chatMessage = await request.post(`${API_BASE_URL}/tasks/${created.taskId}/messages`, {
      headers: { Authorization: 'Bearer ' + runnerToken, 'Content-Type': 'application/json' },
      data: { content: 'I am documenting the agreed task scope before escalating this issue.' },
    })
    expect(chatMessage.ok(), `Unable to create Chat Hub evidence: HTTP ${chatMessage.status()}`).toBeTruthy()

    const runnerPage = await browser.newPage()
    try {
      await loginUi(runnerPage, requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL))
      await runnerPage.goto(`/tasks/${created.taskId}/chat`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await expect(runnerPage.getByRole('button', { name: /Report issue/i })).toBeVisible({ timeout: 30_000 })
      await runnerPage.getByRole('button', { name: /Attach as evidence/i }).first().click()
      await runnerPage.getByRole('button', { name: /Report issue/i }).click()
      await expect(runnerPage.getByRole('heading', { name: /Report a task incident/i })).toBeVisible()
      await runnerPage.locator('.chat-incident-dialog select').selectOption('Scope change')
      await runnerPage.locator('.chat-incident-dialog textarea').fill('The task scope changed after acceptance and I need DFY to review the agreed requirements and chat history.')
      const incidentResponse = runnerPage.waitForResponse(res =>
        res.url().includes('/api/v1/tasks/' + created.taskId + '/incidents') && res.request().method() === 'POST',
        { timeout: 30_000 }
      )
      await runnerPage.getByRole('button', { name: /Send report/i }).click()
      const incidentHttp = await incidentResponse
      expect(incidentHttp.ok(), `Incident report failed: HTTP ${incidentHttp.status()} body=${await incidentHttp.text()}`).toBeTruthy()
    } finally {
      await runnerPage.close()
    }

    const taskAfterReport = await getTask(request, creatorToken, created.taskId)
    expect(String(taskAfterReport.paymentStatus).toLowerCase()).toBe('escrowheld')
    expect(String(taskAfterReport.escrowStatus).toLowerCase()).toBe('held')

    const incidentsResponse = await request.get(`${API_BASE_URL}/admin/incidents?status=Open&page=1&pageSize=50`, {
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    expect(incidentsResponse.ok()).toBeTruthy()
    const incidentsBody = await incidentsResponse.json()
    const incident = (incidentsBody.data?.incidents || []).find((item: any) => item.taskReference === created.taskId)
    expect(incident).toBeTruthy()
    expect(JSON.parse(incident.evidenceMessageIdsJson || '[]').length).toBeGreaterThan(0)

    const evidenceResponse = await request.get(`${API_BASE_URL}/admin/incidents/${incident.id}/evidence`, {
      headers: { Authorization: 'Bearer ' + adminToken },
    })
    expect(evidenceResponse.ok()).toBeTruthy()
    const evidenceBody = await evidenceResponse.json()
    expect(evidenceBody.data?.length).toBeGreaterThan(0)

    const hold = await request.post(`${API_BASE_URL}/admin/incidents/${incident.id}/hold-escrow`, {
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      data: { reason: 'Admin E2E: preserve the creator confirmation window while reviewing incident evidence.' },
    })
    expect(hold.ok(), `Admin escrow hold failed: HTTP ${hold.status()} body=${await hold.text()}`).toBeTruthy()
    const taskOnHold = await getTask(request, creatorToken, created.taskId)
    expect(String(taskOnHold.escrowStatus).toLowerCase()).toBe('incident_hold')
    expect(String(taskOnHold.paymentStatus).toLowerCase()).toBe('escrowheld')

    const releaseHold = await request.post(`${API_BASE_URL}/admin/incidents/${incident.id}/release-escrow-hold`, {
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      data: { reason: 'Admin E2E: incident evidence reviewed; restore normal confirmation process.' },
    })
    expect(releaseHold.ok(), `Admin escrow hold release failed: HTTP ${releaseHold.status()} body=${await releaseHold.text()}`).toBeTruthy()
    const taskAfterHold = await getTask(request, creatorToken, created.taskId)
    expect(String(taskAfterHold.escrowStatus).toLowerCase()).toBe('held')
    expect(String(taskAfterHold.paymentStatus).toLowerCase()).toBe('escrowheld')

    const review = await request.patch(`${API_BASE_URL}/admin/incidents/${incident.id}`, {
      headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' },
      data: { status: 'Resolved', adminNotes: 'Reviewed the incident and referenced Chat Hub evidence. No escrow action was required.' },
    })
    expect(review.ok(), `Incident review failed: HTTP ${review.status()} body=${await review.text()}`).toBeTruthy()

    const taskAfterReview = await getTask(request, creatorToken, created.taskId)
    expect(String(taskAfterReview.paymentStatus).toLowerCase()).toBe('escrowheld')
    expect(String(taskAfterReview.escrowStatus).toLowerCase()).toBe('held')
  })
})
