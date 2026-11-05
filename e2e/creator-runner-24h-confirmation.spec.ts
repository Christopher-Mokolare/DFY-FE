import { test, expect, Page, request, type APIRequestContext } from '@playwright/test'

const API_BASE_URL = (process.env.DFY_API_URL || 'https://dfy-be-staging.onrender.com/api/v1').replace(/\/$/, '')
const CREATOR_EMAIL = process.env.DFY_CREATOR_EMAIL
const CREATOR_PASSWORD = process.env.DFY_CREATOR_PASSWORD
const RUNNER_EMAIL = process.env.DFY_RUNNER_EMAIL
const RUNNER_PASSWORD = process.env.DFY_RUNNER_PASSWORD
const ADMIN_EMAIL = process.env.DFY_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.DFY_ADMIN_PASSWORD

test.setTimeout(3 * 60 * 1000)

function requireEnv(name: string, value?: string) {
  if (!value) throw new Error(name + ' GitHub Actions secret is required for this E2E.')
  return value
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/i, { timeout: 30_000 })
}

async function getToken(page: Page) {
  return page.evaluate(() => localStorage.getItem('token'))
}

async function ensureRunnerBank(api: APIRequestContext, runnerToken: string) {
  const response = await api.get(API_BASE_URL + '/banking/accounts', {
    headers: { Authorization: 'Bearer ' + runnerToken },
  })
  expect(response.ok(), `Could not check runner payout settings: HTTP ${response.status()} body=${await response.text()}`).toBeTruthy()
  const body = await response.json()
  const accounts = body.data || body.accounts || []
  if (!Array.isArray(accounts) || !accounts.some((account: any) => account.isVerified === true || account.IsVerified === true)) {
    test.skip(true, 'Configure an active, Paystack-verified runner bank account with a recipient reference before running payout lifecycle E2E.')
  }
}

test('creator -> runner -> completion -> automatic 24h confirmation lifecycle', async ({ browser, page }) => {
  const creatorEmail = requireEnv('DFY_CREATOR_EMAIL', CREATOR_EMAIL)
  const creatorPassword = requireEnv('DFY_CREATOR_PASSWORD', CREATOR_PASSWORD)
  const runnerEmail = requireEnv('DFY_RUNNER_EMAIL', RUNNER_EMAIL)
  const runnerPassword = requireEnv('DFY_RUNNER_PASSWORD', RUNNER_PASSWORD)
  const adminEmail = requireEnv('DFY_ADMIN_EMAIL', ADMIN_EMAIL)
  const adminPassword = requireEnv('DFY_ADMIN_PASSWORD', ADMIN_PASSWORD)
  const api = await request.newContext()
  const unique = Date.now()
  const taskName = 'E2E 24H Confirmation ' + unique
  const taskDescription = 'Automated end-to-end task for creator runner acceptance and 24 hour confirmation testing ' + unique
  const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const runnerLogin = await api.post(API_BASE_URL + '/auth/login', {
      data: { email: runnerEmail, password: runnerPassword },
    })
    const runnerBody = await runnerLogin.json()
    expect(
      runnerLogin.ok() && runnerBody.success,
      `Runner preflight authentication failed: HTTP ${runnerLogin.status()} response=${JSON.stringify(runnerBody)}. Check DFY_RUNNER_EMAIL/PASSWORD and confirm this account exists in the staging database.`,
    ).toBeTruthy()
    const runnerToken = runnerBody.token || runnerBody.data?.token
    expect(runnerToken, 'Runner login succeeded without returning a token.').toBeTruthy()
    await ensureRunnerBank(api, String(runnerToken))

    // Authenticate creator and admin before any task is created.
    const creatorPreflight = await api.post(API_BASE_URL + '/auth/login', {
      data: { email: creatorEmail, password: creatorPassword },
    })
    const creatorPreflightBody = await creatorPreflight.json()
    expect(
      creatorPreflight.ok() && creatorPreflightBody.success,
      `Creator preflight authentication failed: HTTP ${creatorPreflight.status()} response=${JSON.stringify(creatorPreflightBody)}. Check DFY_CREATOR_EMAIL/PASSWORD and the staging database.`,
    ).toBeTruthy()

    const adminLogin = await api.post(API_BASE_URL + '/auth/login', {
      data: { email: adminEmail, password: adminPassword },
    })
    const adminBody = await adminLogin.json()
    expect(
      adminLogin.ok() && adminBody.success,
      `Admin preflight authentication failed: HTTP ${adminLogin.status()} response=${JSON.stringify(adminBody)}. Check DFY_ADMIN_EMAIL/PASSWORD and the staging database.`,
    ).toBeTruthy()
    const adminToken = adminBody.token || adminBody.data?.token
    expect(adminToken, 'Admin login succeeded without returning a token.').toBeTruthy()

    // 1. Creator creates a brand-new task through the real API.
    await login(page, creatorEmail, creatorPassword)
    const creatorToken = await getToken(page)
    expect(creatorToken).toBeTruthy()

    const create = await api.post(API_BASE_URL + '/tasks', {
      headers: { Authorization: 'Bearer ' + creatorToken },
      data: {
        taskName,
        taskDescription,
        category: 'Other',
        area: 'Pretoria',
        priority: 'standard',
        dateNeeded: futureDate,
        budget: 200,
        notes: 'E2E lifecycle test',
        termsAccepted: true,
      },
    })

    // Task creation persists before the Ozow redirect is attempted. The staging
    // Ozow call may therefore return 200 or 502; either way we recover the new
    // task from the creator's posted-task list and use the admin payment-seed
    // path below instead of touching Ozow.
    expect([200, 502]).toContain(create.status())

    const posted = await api.get(API_BASE_URL + '/tasks/my-posted', {
      headers: { Authorization: 'Bearer ' + creatorToken },
    })
    expect(posted.ok()).toBeTruthy()
    const postedBody = await posted.json()
    const tasks = postedBody.data?.tasks || postedBody.data?.Tasks || []
    const createdTask = tasks.find((t: any) => t.taskName === taskName)
    expect(createdTask).toBeTruthy()
    const taskId = createdTask.taskId
    expect(taskId).toBeTruthy()

    // 2. Admin marks only this new task as paid/escrow-held. This replaces the
    // external Ozow payment for the E2E while exercising the real posted-task state.
    const verify = await api.patch(API_BASE_URL + '/admin/tasks/bulk-verify', {
      headers: { Authorization: 'Bearer ' + adminToken },
      data: {
        taskIds: [taskId],
        reason: 'Automated E2E payment bypass; no external Ozow transaction',
      },
    })
    expect(verify.ok()).toBeTruthy()
    expect((await verify.json()).success).toBeTruthy()

    // 3. Runner uses the actual Browse Tasks UI and accepts this new task.
    const runnerPage = await browser.newPage()
    try {
      await login(runnerPage, runnerEmail, runnerPassword)
      await runnerPage.goto('/tasks/browse', { waitUntil: 'domcontentloaded', timeout: 60_000 })
      const search = runnerPage.getByPlaceholder('Search tasks...')
      // The backend's available-task search matches task description and area,
      // not taskName. Use the unique description token so the API and UI agree
      // on the same newly-created task.
      const browseSearch = String(unique)
      await search.fill(browseSearch)
      await search.press('Enter')
      const acceptHeading = runnerPage.getByRole('heading', { name: /accept task/i })
      const findTaskCard = () => runnerPage.locator('.task-card').filter({ hasText: taskName }).first()

      // Browse Tasks refreshes its result list after verification. Re-query the
      // card immediately before clicking so a React list refresh cannot leave
      // Playwright holding a detached DOM node.
      const runnerToken = await getToken(runnerPage)
      expect(runnerToken).toBeTruthy()

      // Wait on the source of truth first. Admin verification changes the task
      // to Posted/EscrowHeld, and /tasks/available only exposes that state.
      await expect.poll(async () => {
        const available = await api.get(
          API_BASE_URL + '/tasks/available?page=1&pageSize=10&search=' + encodeURIComponent(browseSearch),
          { headers: { Authorization: 'Bearer ' + runnerToken } }
        )
        if (!available.ok()) return false
        const body = await available.json()
        const list = body.tasks || body.data?.tasks || body.data?.Tasks || []
        return Array.isArray(list) && list.some((t: any) => t.taskName === taskName)
      }, { timeout: 45_000, intervals: [500, 1000, 2000] }).toBe(true)

      // Now that the API confirms the task is browseable, render the UI once
      // and search using the same backend-supported field.
      await runnerPage.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
      const searchAgain = runnerPage.getByPlaceholder('Search tasks...')
      await searchAgain.fill(browseSearch)
      await searchAgain.press('Enter')
      const card = findTaskCard()
      await expect(card).toBeVisible({ timeout: 30_000 })

      try {
        await card.getByRole('button', { name: /accept task/i }).click({ timeout: 10_000 })
      } catch {
        // If the Browse Tasks list refreshed during the click, confirm whether
        // the first click actually opened the modal before trying again.
        if (!(await acceptHeading.isVisible().catch(() => false))) {
          await runnerPage.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
          const searchAgain = runnerPage.getByPlaceholder('Search tasks...')
          await searchAgain.fill(browseSearch)
          await searchAgain.press('Enter')
          const refreshedCard = findTaskCard()
          await expect(refreshedCard).toBeVisible({ timeout: 30_000 })
          await refreshedCard.getByRole('button', { name: /accept task/i }).click({ timeout: 10_000 })
        }
      }
      await expect(acceptHeading).toBeVisible({ timeout: 30_000 })
      await runnerPage.getByText(/I agree to the runner terms/i).click()
      await runnerPage.getByRole('button', { name: /^Accept Task$/ }).click()
      await expect(runnerPage).toHaveURL(/\/tasks\/my-active/, { timeout: 30_000 })

      // 4. Runner marks the task complete through the real UI.
      // My Active Tasks renders the API's title/description fields; taskName is
      // not included in that response, so locate the same task by its description.
      const activeCard = runnerPage.locator('.task-card').filter({ hasText: taskDescription }).first()
      await expect(activeCard).toBeVisible({ timeout: 30_000 })
      await activeCard.getByRole('button', { name: /mark as complete/i }).click()
      await expect(runnerPage.getByRole('heading', { name: /mark task complete/i })).toBeVisible()
      await runnerPage.getByRole('button', { name: /^Mark Complete$/ }).click()
      await expect(activeCard).toHaveCount(0, { timeout: 30_000 })
    } finally {
      await runnerPage.close()
    }

    // 5. Creator sees the real Awaiting Confirmation UI and the 24-hour rule.
    await page.goto('/tasks/my-posted?taskId=' + encodeURIComponent(taskId), { waitUntil: 'domcontentloaded', timeout: 60_000 })
    const postedCard = page.locator('#posted-task-' + taskId)
    await expect(postedCard).toBeVisible({ timeout: 30_000 })
    await expect(postedCard).toContainText(/AwaitingConfirmation|Awaiting Confirmation/i)
    await expect(postedCard).toContainText(/24 hours|remaining to confirm|automatically confirms/i)

    // 6. Expire the exact confirmation deadline and execute the production
    // AutoReleaseExpiredEscrowsAsync path. The BE endpoint is admin-only and
    // exists only when DFY_E2E_TEST_MODE=true on the staging API.
    const expire = await api.patch(API_BASE_URL + '/admin/tasks/' + encodeURIComponent(taskId) + '/expire-confirmation', {
      headers: { Authorization: 'Bearer ' + adminToken },
      data: { reason: 'Automated E2E: simulate 24-hour confirmation expiry' },
    })
    const expireResponseText = await expire.text()
    expect(expire.ok(), `expire-confirmation failed: HTTP ${expire.status()} body=${expireResponseText}`).toBeTruthy()
    const expireBody = JSON.parse(expireResponseText)
    expect(expireBody.success, `expire-confirmation returned success=false: ${expireResponseText}`).toBeTruthy()

    // 7. Verify the escrow hand-off without allowing the Paystack payout processor
    // to submit anything externally in E2E mode.
    const finalTask = await api.get(API_BASE_URL + '/tasks/' + encodeURIComponent(taskId), {
      headers: { Authorization: 'Bearer ' + creatorToken },
    })
    expect(finalTask.ok()).toBeTruthy()
    const finalBody = await finalTask.json()
    expect(finalBody.data?.status).toBe('payoutpending')
    expect(finalBody.data?.paymentStatus).toBe('EscrowReleased')
    expect(finalBody.data?.escrowStatus).toBe('released')

    // The creator UI is verified at the AwaitingConfirmation stage above.
    // After automatic confirmation the API is the authoritative source for the
    // financial state; the task may leave the confirmation-only UI grouping.
  } finally {
    await api.dispose()
  }
})
