import { NextResponse } from 'next/server'
import { getPaymentProvider } from '@/lib/providers'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const order = body.order
    if (!order) return NextResponse.json({ error: 'missing order' }, { status: 400 })

    console.log('[payments/checkout] creating session for order:', {
      items: (order.items || []).length,
      currency: order.currency,
      total: order.total || null
    })

    const provider = getPaymentProvider()
  console.log('[payments/checkout] PAYMENT_PROVIDER env:', process.env.PAYMENT_PROVIDER || '(unset)')
  console.log('[payments/checkout] provider loaded:', typeof provider === 'object' ? Object.keys(provider) : String(provider))
    if (!provider || typeof provider.createCheckoutSession !== 'function') {
      console.error('[payments/checkout] invalid payment provider loaded', provider)
      return NextResponse.json({ error: 'invalid payment provider' }, { status: 500 })
    }

    const result = await provider.createCheckoutSession(order)
    console.log('[payments/checkout] provider result:', { checkoutUrl: result?.checkoutUrl, sessionId: result?.sessionId })
    return NextResponse.json({ checkoutUrl: result.checkoutUrl, sessionId: result.sessionId })
  } catch (err: any) {
    console.error('[payments/checkout] unexpected error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
