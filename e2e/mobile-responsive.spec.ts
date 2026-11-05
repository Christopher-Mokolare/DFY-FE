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

async function waitForApiReady() {
  const api = await request.newContext()
  try {
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const response = await api.get('https://dfy-be-staging.onrender.com/health', { timeout: 10_000 })
        if (response.ok()) return
      } catch {
        // Render may still be warming/redeploying the staging API.
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    throw new Error('DFY staging API did not become healthy within 60 seconds.')
  } finally {
    await api.dispose()
  }
}

const CREATOR_EMAIL = process.env.DFY_CREATOR_EMAIL
const CREATOR_PASSWORD = process.env.DFY_CREATOR_PASSWORD
const RUNNER_EMAIL = process.env.DFY_RUNNER_EMAIL
const RUNNER_PASSWORD = process.env.DFY_RUNNER_PASSWORD

function requireTestAccounts() {
  if (!CREATOR_EMAIL || !CREATOR_PASSWORD || !RUNNER_EMAIL || !RUNNER_PASSWORD) {
    throw new Error('Mobile E2E requires DFY_CREATOR_EMAIL/PASSWORD and DFY_RUNNER_EMAIL/PASSWORD GitHub Actions secrets.')
  }
}

async function login(page: Page, email: string, password: string) {
  await waitForApiReady()
  await gotoWithRetry(page, '/login')
  const loginRequest = page.waitForResponse((res) =>
    res.url().includes('/auth/login') && res.request().method() === 'POST',
    { timeout: 30_000 }
  )
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  const response = await loginRequest
  if (!response.ok()) throw new Error('Configured test account login failed: ' + response.status() + ' ' + await response.text())
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
    await page.evaluate(async () => {
      const isScrollable = (el: HTMLElement) => {
        const styles = getComputedStyle(el)
        return /(auto|scroll)/.test(styles.overflowY) && el.scrollHeight > el.clientHeight
      }

      const anchor = document.querySelector('.admin-content') as HTMLElement | null
      const scrollTargets = new Set<HTMLElement>()

      if (anchor) {
        let current: HTMLElement | null = anchor
        while (current) {
          if (isScrollable(current)) scrollTargets.add(current)
          current = current.parentElement
        }
      }

      const root = document.scrollingElement as HTMLElement | null
      if (root) scrollTargets.add(root)

      // The application enables smooth scrolling globally. For this structural
      // assertion we need deterministic scroll-end coordinates, not an animation
      // that can still be in flight when the measurement runs.
      const html = document.documentElement
      const previousBehavior = html.style.scrollBehavior
      html.style.scrollBehavior = 'auto'
      try {
        for (let pass = 0; pass < 8; pass++) {
          for (const target of scrollTargets) target.scrollTop = target.scrollHeight
          if (root) root.scrollTop = root.scrollHeight
          document.body.scrollTop = document.body.scrollHeight
          window.scrollTo(0, document.documentElement.scrollHeight)
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } finally {
        html.style.scrollBehavior = previousBehavior
      }
    })
    await page.waitForTimeout(100)

    const navBox = await mobileNav.boundingBox()
    if (navBox) {
      // Browse Tasks is a real card grid inside the workspace shell. Measure its
      // last rendered card directly; the shell's pseudo-element is only clearance
      // and should not be mistaken for painted task content.
      if (route === '/tasks/browse') {
        const lastTaskCard = page.locator('.browse-page .tasks-grid .task-card').last()
        if (await lastTaskCard.count()) {
          const cardBox = await lastTaskCard.boundingBox()
          expect(cardBox).not.toBeNull()
          if (cardBox) {
            expect(
              cardBox.y + cardBox.height,
              `${route}: last task card is behind the fixed mobile navigation`
            ).toBeLessThanOrEqual(navBox.y + 1)
          }
          return
        }
      }

      const contentBottom = await page.evaluate(() => {
        const spacerHeight = (el: Element) => {
          const styles = getComputedStyle(el, '::after')
          return styles.content !== 'none' ? parseFloat(styles.height) || 0 : 0
        }

        const adminContent = document.querySelector('.admin-content')
        if (!adminContent) return 0

        const box = adminContent.getBoundingClientRect()
        const styles = getComputedStyle(adminContent)
        const paddingBottom = parseFloat(styles.paddingBottom) || 0
        const borderBottom = parseFloat(styles.borderBottomWidth) || 0
        const shellAfter = spacerHeight(adminContent)

        // The workspace owns the fixed-nav clearance as ::after and the
        // final-child padding. Measure the shell at the true scroll end and
        // subtract those non-painted regions instead of measuring a nested
        // page wrapper whose box can include its own layout behavior.
        const lastChild = adminContent.lastElementChild
        let childClearance = 0
        if (lastChild) {
          const childStyles = getComputedStyle(lastChild)
          childClearance =
            (parseFloat(childStyles.paddingBottom) || 0) +
            spacerHeight(lastChild)
        }

        return box.width > 0 && box.height > 0
          ? box.bottom - paddingBottom - borderBottom - shellAfter - childClearance
          : 0
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
    // Reuse existing staging tasks. This test must not register accounts or create tasks.
    requireTestAccounts()
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
  test.beforeEach(async ({ page }) => {
    requireTestAccounts()
    await login(page, CREATOR_EMAIL!, CREATOR_PASSWORD!)
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
  test.beforeEach(async ({ page }) => {
    requireTestAccounts()
    await login(page, RUNNER_EMAIL!, RUNNER_PASSWORD!)
  })

  for (const route of ['/dashboard', '/activity', '/tasks/browse', '/tasks/my-active', '/tasks/my-completed', '/messages', '/notifications', '/user/profile', '/user/bank-accounts']) {
    test(route, async ({ page }) => {
      await assertMobileLayout(page, route)
    })
  }
})
