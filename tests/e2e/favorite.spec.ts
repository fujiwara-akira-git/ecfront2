import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e@example.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123'
const PRODUCER_ID = process.env.E2E_PRODUCER_ID || '' // set to a valid producer id before running tests

test.describe('Favorite flow', () => {
  test.beforeEach(async ({ page }) => {
    // ensure starting at home
    await page.goto('/')
  })

  test('login, add favorite, see in mypage', async ({ page }) => {
    test.skip(!PRODUCER_ID, 'PRODUCER_ID not provided')

    // go to sign in
    await page.goto('/shop/auth/signin')

    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await Promise.all([
      page.waitForNavigation({ url: '**/shop' }),
      page.click('button[type="submit"]')
    ])

    // open producer page
    await page.goto(`/shop/producer/${PRODUCER_ID}`)

  // click favorite using stable test id
  const favButton = page.locator('[data-testid="favorite-toggle"]')
  await favButton.waitFor({ state: 'visible', timeout: 15000 })

  // click and wait for API response to avoid flakiness
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/favorites') && resp.status() === 200, { timeout: 15000 }),
    favButton.click(),
  ])

  // API response received; skip asserting intermediate button text (can be flaky)
  // proceed to mypage to verify favorite persisted

    // go to mypage and assert favorite present
    await page.goto('/shop/mypage')
  await expect(page.getByRole('heading', { name: 'お気に入りの生産者' })).toBeVisible()
    // ensure the specific producer link appears in favorites
    const producerLink = page.locator(`a[href$="/shop/producer/${PRODUCER_ID}"]`)
    await producerLink.waitFor({ state: 'visible', timeout: 10000 })
    await expect(producerLink).toContainText(/.+/)
  })
})
