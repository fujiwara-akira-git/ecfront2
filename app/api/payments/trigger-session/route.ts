import { NextResponse } from 'next/server'
import { getPaymentProvider } from '@/lib/providers'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const sessionId = body.sessionId
    if (!sessionId) return NextResponse.json({ error: 'missing sessionId' }, { status: 400 })

    const provider = getPaymentProvider()
    if (!provider || typeof provider.handleWebhookEvent !== 'function') {
      return NextResponse.json({ error: 'invalid provider' }, { status: 500 })
    }

    // Construct a minimal payload that resembles Stripe's checkout.session.completed
    const payload = {
      id: `manual-${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          metadata: {},
        }
      }
    }

    await provider.handleWebhookEvent(payload)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[payments/trigger-session] error', err)
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 })
  }
}
