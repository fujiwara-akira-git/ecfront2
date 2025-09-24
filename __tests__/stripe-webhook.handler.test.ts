/**
/**
 * Unit test for handleWebhookEvent focusing on payload fallback
 * and metadata.expectedTotal precedence.
 */

// Ensure provider will allow payload fallback in this test environment
process.env.DISABLE_STRIPE_PAYLOAD_FALLBACK_IN_PRODUCTION = 'false'
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
process.env.DATABASE_URL = 'postgresql://dev:dev@127.0.0.1:5432/dev'

// Prepare stripe retrieve mock to reject with resource_missing
const retrieveMock = jest.fn().mockRejectedValue({ code: 'resource_missing', message: 'No such checkout.session' })

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { retrieve: retrieveMock } },
    customers: { retrieve: jest.fn().mockResolvedValue({}) }
  }))
})

// Prepare a prisma mock to be returned when provider imports ../lib/prisma
const prismaMock = {
  prisma: {
    stripeEvent: {
      upsert: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn().mockResolvedValue({ id: 'evt_manual_cs_test', processed: false })
    },
    $queryRaw: jest.fn().mockResolvedValue(1),
    payment: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'p1' }) },
    order: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'new_order_id' }),
      update: jest.fn().mockResolvedValue({ id: 'updated_order_id' })
    },
    orderItem: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    user: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue(null) },
    cartItem: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    product: { findUnique: jest.fn().mockResolvedValue(null), findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'placeholder_prod' }) }
  }
}

jest.mock('../lib/prisma', () => prismaMock)

import { stripeProvider } from '../lib/providers/stripe'

describe('stripeProvider.handleWebhookEvent - fallback and metadata precedence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    retrieveMock.mockClear()
  })

  test('uses payload fallback when retrieve returns resource_missing and respects metadata.expectedTotal', async () => {
    const payload: any = {
      id: 'evt_manual_cs_test',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_fallback_1',
          amount_total: 2780,
          currency: 'jpy',
          payment_status: 'paid',
          metadata: { orderId: 'nonexistent', expectedTotal: '2500', userEmail: 'test@example.com' },
          payment_intent: 'pi_manual_for_test',
          shipping_details: { address: { postal_code: '100-0001', line1: 'Tokyo' } }
        }
      }
    }

    await stripeProvider.handleWebhookEvent(payload)

    const p = (prismaMock as any).prisma
    expect(p.order.create).toHaveBeenCalled()
    const createArgs = (p.order.create as jest.Mock).mock.calls[0][0]
    expect(createArgs.data.totalAmount).toBe(2500)
    expect(p.payment.create).toHaveBeenCalled()
  })
})
