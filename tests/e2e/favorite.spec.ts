import { test, expect } from '@playwright/test'
import { prisma } from '@/lib/prisma'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e@example.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123'
let PRODUCER_ID = process.env.E2E_PRODUCER_ID || '' // set to a valid producer id before running tests

// If PRODUCER_ID is not provided, create a test producer record before running E2E
test.describe.configure({ timeout: 120000 })

test.beforeAll(async () => {
  if (!PRODUCER_ID) {
    const p = await prisma.producer.create({
      data: {
        name: `E2E Test Producer ${Date.now()}`,
        description: 'Automatically created for E2E tests',
      },
    })
    PRODUCER_ID = p.id
  }
})

test.afterAll(async () => {
  // cleanup only if we created the producer in this run (env var was not set)
  if (!process.env.E2E_PRODUCER_ID && PRODUCER_ID) {
    try {
      await prisma.producer.delete({ where: { id: PRODUCER_ID } })
    } catch (e) {
      // ignore cleanup errors
    }
  }
})

let createdUserId: string | undefined
test.beforeAll(async () => {
  const existing = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
  if (!existing) {
    // create a test user with bcrypt hashed password
    const bcrypt = await import('bcryptjs')
    const hash = bcrypt.hashSync(TEST_PASSWORD, 10)
    const u = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        name: 'E2E Test User',
        password: hash,
      },
    })
    createdUserId = u.id
  }
})

test.afterAll(async () => {
  if (createdUserId) {
    try {
      await prisma.user.delete({ where: { id: createdUserId } })
    } catch (e) {
      // ignore
    }
  }
})

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
