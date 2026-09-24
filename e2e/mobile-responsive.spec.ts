import { test, expect, Page, request } from '@playwright/test'

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  // Local preview uses the staging API; CI-only web-security bypass permits the cross-origin test API.
  launchOptions: {
    args: process.env.BASE_URL?.startsWith('http://127.0.0.1') ? ['--disable-web-security'] : [],
  },
})

const PASSWORD = 'Test@1234'

function makeEmail(prefix: string) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '@test.dfy'
}

function makeIdentity() {
  const sequence = String(Date.now() % 10000).padStart(4, '0')
  const first12 = '900101' + sequence + '08'
  const digits = first12.split('').map(Number)
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    if (i % 2 === 0) sum += digits[i]
    else {
      const doubled = digits[i] * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    }
  }
  return first12 + String((10 - (sum % 10)) % 10)
}

function makePhone() {
  return '082' + String(Date.now() % 10000000).padStart(7, '0')
}

async function waitForAppReady(page: Page) {
  await page.waitForFunction(
    () => document.title !== 'Render - Application loading',
    { timeout: 90_000 }
  )
}

async function gotoWithRetry(page: Page, url: string) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await waitForAppReady(page)
      return
    } catch (error) {
      lastError = error
      if (attempt < 2) await page.waitForTimeout(2000)
    }
  }
  throw lastError
}

async function register(page: Page, email: string, userType: 'creator' | 'runner') {
  await gotoWithRetry(page, '/register')

  const registerRequest = page.waitForResponse((res) =>
    res.url().includes('/auth/register') && res.request().method() === 'POST',
    { timeout: 30_000 }
  )

  await page.getByPlaceholder('First Name *').fill('Mobile')
  await page.getByPlaceholder('Last Name *').fill('Test')
  await page.getByPlaceholder('Email Address *').fill(email)
  await page.getByPlaceholder('Phone Number *').fill(makePhone())
  await page.getByRole('button', { name: /continue/i }).click()

  await page.locator(`label.role-card:has(input[value="${userType}"])`).click({ force: true })
  await page.getByPlaceholder('ID Number *').fill(makeIdentity())
  await page.getByPlaceholder('Address *').fill('123 Test Street, Johannesburg')
  await page.getByRole('button', { name: /continue/i }).last().click()

  await page.locator('input[placeholder="Password *"]').fill(PASSWORD)
  await page.locator('input[placeholder="Confirm Password *"]').fill(PASSWORD)
  await page.getByRole('button', { name: /create account/i }).click()
  await registerRequest
  await expect(page).toHaveURL(/login/i, { timeout: 30_000 })
}

async function login(page: Page, email: string) {
  await gotoWithRetry(page, '/login')
  const loginRequest = page.waitForResponse((res) =>
    res.url().includes('/auth/login') && res.request().method() === 'POST',
    { timeout: 30_000 }
  )
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await loginRequest
  await expect(page).toHaveURL(/dashboard/i, { timeout: 30_000 })
}

async function assertMobileLayout(page: Page, route: string) {
  await gotoWithRetry(page, route)

  await expect.poll(async () => page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toMatchObject({ width: expect.any(Number) })

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }))
  expect(overflow.scrollWidth, `${route}: horizontal document overflow`).toBeLessThanOrEqual(overflow.clientWidth + 1)
  expect(overflow.bodyScrollWidth, `${route}: horizontal body overflow`).toBeLessThanOrEqual(overflow.clientWidth + 1)

  const mobileNav = page.locator('.user-mobile-bottom-nav')
  if (await mobileNav.count()) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(150)

    const navBox = await mobileNav.boundingBox()
    if (navBox) {
      const contentBottom = await page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll(
          '.admin-content > section, .admin-content > article, .admin-content > form, .admin-content > div'
        ))
        const boxes = candidates
          .map(el => {
            const box = el.getBoundingClientRect()
            const styles = getComputedStyle(el)
            const paddingBottom = parseFloat(styles.paddingBottom) || 0
            const borderBottom = parseFloat(styles.borderBottomWidth) || 0
            return box.width > 0 && box.height > 0
              ? box.bottom - paddingBottom - borderBottom
              : 0
          })
          .filter(bottom => bottom > 0)
        return boxes.length ? Math.max(...boxes) : 0
      })
      expect(
        contentBottom,
        `${route}: final content is behind the fixed mobile navigation`
      ).toBeLessThanOrEqual(navBox.y + 1)
    }
  }
}

test.describe.configure({ mode: 'serial' })

test.describe('mobile task details modal', () => {
  test('view task modal stays fully inside the mobile viewport', async ({ page }) => {
    await gotoWithRetry(page, '/tasks/browse')

    const viewTask = page.getByRole('button', { name: /view task/i }).first()
    await expect(viewTask).toBeVisible({ timeout: 30_000 })
    await viewTask.click()

    const modal = page.locator('.task-detail-modal')
    await expect(modal).toBeVisible()

    const viewport = page.viewportSize()
    expect(viewport).not.toBeNull()

    const box = await modal.boundingBox()
    expect(box).not.toBeNull()

    if (box && viewport) {
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
    }

    const footer = modal.locator('.modal-footer')
    await expect(footer).toBeVisible()
    await expect(footer.getByRole('button', { name: /close/i })).toBeVisible()
    await expect(footer.getByRole('button', { name: /sign in|accept task|complete profile|not available/i })).toBeVisible()

    const footerBox = await footer.boundingBox()
    expect(footerBox).not.toBeNull()
    if (footerBox && viewport) {
      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(viewport.height + 1)
    }
  })
})

test.describe('mobile responsiveness - public screens', () => {
  for (const route of ['/', '/about', '/contact', '/terms', '/login', '/register', '/tasks/browse']) {
    test(route, async ({ page }) => {
      await assertMobileLayout(page, route)
    })
  }
})

test.describe('mobile responsiveness - creator screens', () => {
  let creatorEmail = ''

  test.beforeAll(async () => {
    const ctx = await request.newContext()
    await ctx.get('https://dfy-be-staging.onrender.com/health')
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    if (!creatorEmail) {
      creatorEmail = makeEmail('mobile-creator')
      await register(page, creatorEmail, 'creator')
    }
    await login(page, creatorEmail)
  })

  for (const route of [
    '/dashboard',
    '/activity',
    '/tasks/post',
    '/tasks/my-posted',
    '/tasks/action-required',
    '/tasks/my-completed',
    '/messages',
    '/notifications',
    '/user/profile',
    '/user/bank-accounts',
  ]) {
    test(route, async ({ page }) => {
      await assertMobileLayout(page, route)
    })
  }
})

test.describe('mobile responsiveness - runner screens', () => {
  let runnerEmail = ''

  test.beforeEach(async ({ page }) => {
    if (!runnerEmail) {
      runnerEmail = makeEmail('mobile-runner')
      await register(page, runnerEmail, 'runner')
    }
    await login(page, runnerEmail)
  })

  for (const route of ['/dashboard', '/activity', '/tasks/browse', '/tasks/my-active', '/tasks/my-completed', '/messages', '/notifications', '/user/profile', '/user/bank-accounts']) {
    test(route, async ({ page }) => {
      await assertMobileLayout(page, route)
    })
  }
})
