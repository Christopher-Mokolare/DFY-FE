import { test, expect } from '@playwright/test'

test.describe('public marketing experience', () => {
  test('homepage exposes essential SEO metadata and a clear task-marketplace message', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DoForYou.*Get It Done/i)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /South Africa's task marketplace/
    )
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      /DoForYou/
    )
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/get it done/i)
    await expect(page.getByRole('link', { name: /browse tasks/i, exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Post a Task', exact: true })).toBeVisible()
  })

  test('skip navigation reaches the main content landmark', async ({ page }) => {
    await page.goto('/')
    const skipLink = page.getByRole('link', { name: /skip to main content/i })
    await expect(skipLink).toBeAttached()
    await skipLink.focus()
    await expect(skipLink).toBeFocused()
    await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1')
  })

  test('intro video does not autoplay or eagerly download media', async ({ page }) => {
    await page.goto('/')
    const video = page.locator('.video-section video')
    await expect(video).toBeVisible()
    await expect(video).not.toHaveAttribute('autoplay', '')
    await expect(video).toHaveAttribute('preload', 'metadata')
  })

  test('homepage hero and introduction create a clear, image-led first impression', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.hero-visual')).toBeVisible()
    await expect(page.locator('.hero-photo-main img')).toBeVisible()
    await expect(page.getByText(/clear task details\. local people\. progress you can follow/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: /a simpler way to get things moving/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /get to know the process/i })).toHaveAttribute('href', '/how-it-works')
  })

  test('homepage keeps the testimonial section and clear task journey', async ({ page }) => {
    // This is a frontend presentation test: provide deterministic CMS content instead of depending on staging API deployment order.
    await page.route('**/testimonials', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [
        { id: 1, name: 'Thabo M.', role: 'Task Creator', text: 'A helpful experience.', sortOrder: 1 },
        { id: 2, name: 'Lerato K.', role: 'Task Runner', text: 'A great opportunity.', sortOrder: 2 },
        { id: 3, name: 'Sipho N.', role: 'Task Creator', text: 'Simple to use.', sortOrder: 3 },
      ] }),
    }))
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /what people say/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /a clear task journey/i })).toBeVisible()
    await expect(page.locator('.testimonials-section .testimonial-card')).toHaveCount(6)
  })

  test('public journey pages explain distinct creator, runner, and completion steps', async ({ page }) => {
    const routes = [
      { path: '/how-it-works', heading: /from “i need a hand” to “all sorted\.”/i },
      { path: '/for-creators', heading: /your to-do list deserves a team effort/i },
      { path: '/for-runners', heading: /your time has value\. put it to work/i },
      { path: '/faq', heading: /good questions deserve clear answers/i },
      { path: '/payments-and-completion', heading: /clear work\. a fair review\. know where you stand\./i },
    ]

    for (const route of routes) {
      await page.goto(route.path)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading)
      await expect(page.locator('#main-content')).toBeVisible()
      await expect(page.locator('footer')).toBeVisible()
    }
  })

  test('FAQ search and topic filters narrow answers accessibly', async ({ page }) => {
    await page.goto('/faq')
    await page.getByRole('searchbox', { name: /search frequently asked questions/i }).fill('24-hour')
    const confirmationQuestion = page.locator('.premium-faq-item').filter({ hasText: /what happens after a runner marks a task complete/i })
    await expect(confirmationQuestion).toBeVisible()
    await confirmationQuestion.locator('summary').click()
    await expect(confirmationQuestion.getByText(/creator has a 24-hour confirmation period/i)).toBeVisible()
    await page.getByRole('searchbox', { name: /search frequently asked questions/i }).fill('')
    await page.getByRole('button', { name: /runners/i }).click()
    await expect(page.getByRole('heading', { name: /^runners$/i })).toBeVisible()
    await expect(page.getByText(/how do i become a runner/i)).toBeVisible()
  })

  test('footer has working links to help, payments, creators, and runners', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('contentinfo').getByRole('link', { name: /FAQs/i })).toHaveAttribute('href', '/faq')
    await expect(page.getByRole('contentinfo').getByRole('link', { name: /payments & completion/i })).toHaveAttribute('href', '/payments-and-completion')
    await expect(page.getByRole('contentinfo').getByRole('link', { name: /become a runner/i })).toHaveAttribute('href', '/for-runners')
    await expect(page.getByRole('contentinfo').getByRole('link', { name: /contact support/i })).toHaveAttribute('href', '/contact')
  })
})
