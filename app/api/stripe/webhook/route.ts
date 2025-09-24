import { NextRequest, NextResponse } from 'next/server'
import { stripeProvider } from '@/lib/providers/stripe'
import { appendFileSync } from 'fs'
import path from 'path'
import os from 'os'
import { logWebhook } from '@/lib/logging/webhookLogger'

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

    // Structured logging via webhookLogger
    try {
      await logWebhook('stripe', (() => { try { return JSON.parse(body) } catch { return body } })(), Object.fromEntries(request.headers.entries()), { url: request.url })
    } catch (e) {
      console.warn('[webhook] webhookLogger failed:', e)
    }

    // Log webhook payload for debugging
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      body: JSON.parse(body),
      rawBody: body
    }) + '\n'

    try {
      const logPath = path.join(os.tmpdir(), 'stripe-webhook-logs.jsonl')
      appendFileSync(logPath, logEntry)

      // Also append a lightweight marker into system temp for easier inspection
      try {
        const systemLogPath = path.join(os.tmpdir(), 'stripe_webhook_local.log')
        const shortEntry = `${new Date().toISOString()} [webhook] marker id=${JSON.parse(body)?.id || 'no-id'} type=${JSON.parse(body)?.type || 'no-type'}\n`
        appendFileSync(systemLogPath, shortEntry)
      } catch (sysErr) {
        console.warn('[webhook] failed to write temp marker:', sysErr)
      }
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
      try {
        const invalidLogPath = path.join(os.tmpdir(), 'stripe-webhook-invalid.jsonl')
        const invalidEntry = JSON.stringify({ timestamp: new Date().toISOString(), headers: Object.fromEntries(request.headers.entries()), signature: sig, body: (() => { try { return JSON.parse(body) } catch { return body } })() }) + '\n'
        appendFileSync(invalidLogPath, invalidEntry)
      } catch (e) {
        console.warn('[webhook] failed to write invalid-signature log:', e)
      }
      // Also write a persistent error summary for easier debugging
      try {
        const errLogPath = path.join(os.tmpdir(), 'stripe-webhook-errors.jsonl')
        const errEntry = JSON.stringify({
          kind: 'invalid_signature',
          timestamp: new Date().toISOString(),
          signaturePresent: !!sig,
          headers: Object.fromEntries(request.headers.entries()),
          bodySample: (() => { try { const p = JSON.parse(body); return { id: p.id, type: p.type } } catch { return { rawLength: body.length } } })()
        }) + '\n'
        appendFileSync(errLogPath, errEntry)
      } catch (ee) {
        console.warn('[webhook] failed to write persistent error log (invalid signature):', ee)
      }
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