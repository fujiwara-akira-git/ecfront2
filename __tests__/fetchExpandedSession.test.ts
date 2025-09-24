import { fetchExpandedSession, setStripeClient } from '../lib/providers/stripe'

describe('fetchExpandedSession', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    process.env.DISABLE_STRIPE_PAYLOAD_FALLBACK_IN_PRODUCTION = 'false'
    // ensure fallback behavior flag in tests
  })

  it('returns expanded session when stripe.retrieve succeeds', async () => {
    const fakeSession = { id: 'cs_test_1', metadata: { foo: 'bar' }, amount_total: 1000 }
    const stripeInstance: any = { checkout: { sessions: { retrieve: jest.fn().mockResolvedValue(fakeSession) } }, customers: { retrieve: jest.fn() } }
    setStripeClient(stripeInstance)

    const payload = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_test_1' } } }
    const res = await fetchExpandedSession('cs_test_1', payload)
    expect(res.session).toEqual(fakeSession)
    expect(res.recoveredFromPayload).toBe(false)
    expect(res.sessionId).toBe('cs_test_1')
  })

  it('falls back to payload when retrieve throws resource_missing', async () => {
  const err: any = new Error('not found')
  err.code = 'resource_missing'
  const stripeInstance: any = { checkout: { sessions: { retrieve: jest.fn().mockRejectedValue(err) } }, customers: { retrieve: jest.fn() } }
  setStripeClient(stripeInstance)

    const payloadSession = { id: 'cs_test_fallback', metadata: { fallback: 'yes' }, amount_total: 2000 }
    const payload = { id: 'evt_2', type: 'checkout.session.completed', data: { object: payloadSession } }

    const res = await fetchExpandedSession('cs_test_fallback', payload)
    expect(res.session).toEqual(payloadSession)
    expect(res.recoveredFromPayload).toBe(true)
    expect(res.sessionId).toBe('cs_test_fallback')
  })

  it('returns null session when no sessionId present', async () => {
    const payload = { id: 'evt_3', type: 'checkout.session.completed', data: { object: {} } }
    const res = await fetchExpandedSession(undefined as any, payload)
    expect(res.session).toBeNull()
    expect(res.sessionId).toBeUndefined()
  })
})
