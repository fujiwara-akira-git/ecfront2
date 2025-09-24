import { resolveTotalFromSession } from '../lib/providers/stripe'

describe('stripe provider helpers', () => {
  test('resolveTotalFromSession prefers metadata.expectedTotal when present', () => {
    const session = {
      amount_total: 5000,
      metadata: { expectedTotal: '4500' }
    }
    const resolved = resolveTotalFromSession(session)
    expect(resolved).toBe(4500)
  })

  test('resolveTotalFromSession falls back to amount_total when metadata missing', () => {
    const session = { amount_total: 2780, metadata: {} }
    const resolved = resolveTotalFromSession(session)
    expect(resolved).toBe(2780)
  })

  test('resolveTotalFromSession returns 0 for null session', () => {
    const resolved = resolveTotalFromSession(null)
    expect(resolved).toBe(0)
  })
})
