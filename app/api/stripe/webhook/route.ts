import { NextRequest, NextResponse } from 'next/server'
import { stripeProvider } from '@/lib/providers/stripe'
import { appendFileSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature') || ''

    console.log('[webhook] received request:', {
      method: request.method,
      url: request.url,
      signature: sig ? 'present' : 'missing',
      bodyLength: body.length,
      timestamp: new Date().toISOString()
    })

    // Log webhook payload for debugging
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body: JSON.parse(body),
      rawBody: body
    }) + '\n'

    try {
      const logPath = path.join(process.cwd(), 'tmp', 'stripe-webhook-logs.jsonl')
      appendFileSync(logPath, logEntry)
    } catch (logErr) {
      console.warn('[webhook] failed to write log:', logErr)
    }

    // Verify webhook signature
    const verification = await stripeProvider.verifyWebhook(
      Object.fromEntries(request.headers.entries()),
      body
    )

    if (!verification.valid) {
      console.error('[webhook] invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Process webhook event
    await stripeProvider.handleWebhookEvent(verification.payload)

    return NextResponse.json({ received: true })

  } catch (err: any) {
    console.error('[webhook] error processing webhook:', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}