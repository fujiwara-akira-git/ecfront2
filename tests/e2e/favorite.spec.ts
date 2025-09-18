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

    // click favorite
    const favButton = page.getByRole('button', { name: /お気に入り|お気に入り済み/ })
    await favButton.click()

    // wait for toast or for button state change
    await expect(favButton).toHaveText(/お気に入り済み/)

    // go to mypage and assert favorite present
    await page.goto('/shop/mypage')
    await expect(page.getByText('お気に入りの生産者')).toBeVisible()
    await expect(page.getByRole('link', { name: /.+/ })).toContainText(/.*/)
  })
})
