import { resolveOrCreateOrder } from '../lib/providers/stripe'

jest.mock('/Users/akira2/projects/eagle-palace/ecfront-main2/lib/prisma', () => ({
  prisma: {
    payment: { findFirst: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    orderItem: { findMany: jest.fn(), createMany: jest.fn() },
    product: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    stripeEvent: { upsert: jest.fn() },
    user: { findFirst: jest.fn(), update: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    $queryRaw: jest.fn()
  }
}))

// Minimal smoke tests for resolveOrCreateOrder behavior
describe('resolveOrCreateOrder', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // ensure stripe client is cleared between tests
    const s = require('../lib/providers/stripe')
    if (s && typeof s.setStripeClient === 'function') s.setStripeClient(null)
  })

  it('returns existing order when payment points to order', async () => {
    const fakeOrder = { id: 'order-1' }
  const prisma = (require('/Users/akira2/projects/eagle-palace/ecfront-main2/lib/prisma') as any).prisma
    prisma.payment.findFirst.mockResolvedValue({ id: 'p1', orderId: 'order-1' })
  prisma.order.findUnique.mockResolvedValue(fakeOrder)
  prisma.order.update.mockResolvedValue(fakeOrder)
    const session = { metadata: {}, amount_total: 1000 }
    const payload = { id: 'evt', type: 'checkout.session.completed' }

  const res = await resolveOrCreateOrder(session, payload, undefined, 'addr', 'pi_1', 'cs1')
  expect(res.order).toBeDefined()
  expect(res.order?.id).toBe('order-1')
  })

  it('creates new order when none found', async () => {
  const prisma = (require('/Users/akira2/projects/eagle-palace/ecfront-main2/lib/prisma') as any).prisma
    prisma.payment.findFirst.mockResolvedValue(null)
    prisma.order.findUnique.mockResolvedValue(null)
    prisma.order.findMany.mockResolvedValue([])
    prisma.order.create.mockResolvedValue({ id: 'new-order' })
  prisma.order.update.mockResolvedValue({ id: 'new-order' })

    const session = { metadata: {}, amount_total: 3000, currency: 'jpy' }
    const payload = { id: 'evt2', type: 'checkout.session.completed' }

  const res = await resolveOrCreateOrder(session, payload, undefined, 'addr', undefined, 'cs2')
  expect(res.order).toBeDefined()
  expect(res.order?.id).toBe('new-order')
  })
})
