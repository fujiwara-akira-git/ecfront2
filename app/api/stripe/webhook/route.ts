import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
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
      // Attempt to provide lightweight debug info in the response for
      // correlation: parsed timestamp from header, the received v1, and
      // the instance-computed v1 for the same timestamp+body. Do not
      // expose the webhook secret itself.
      try {
        const sigParts = String(sig).split(',').map(s => s.trim())
        const tPart = sigParts.find(p => p.startsWith('t='))
        const v1Part = sigParts.find(p => p.startsWith('v1='))
        const parsedTimestamp = tPart ? tPart.split('=')[1] : null
        const receivedV1 = v1Part ? v1Part.split('=')[1] : null
        let computedV1: string | null = null
        try {
          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
          if (webhookSecret && parsedTimestamp) {
            computedV1 = crypto.createHmac('sha256', String(webhookSecret)).update(`${parsedTimestamp}.${body}`).digest('hex')
          }
        } catch (e) { /* best-effort */ }
        return NextResponse.json({ error: 'Invalid signature', debug: { parsed_timestamp: parsedTimestamp, received_v1: receivedV1, computed_v1: computedV1 } }, { status: 400 })
      } catch (e) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    }

    // Process webhook event
    await stripeProvider.handleWebhookEvent(verification.payload)

    // TEMP DEBUG: generate an instance identifier and write to tmp so we can
    // correlate which Vercel instance handled this request. This helps
    // diagnose load-balanced cases where our tmp logs are per-instance.
    try {
      const { v4: uuidv4 } = await import('uuid')
      const instanceId = uuidv4()
      try {
        const idLogPath = path.join(os.tmpdir(), 'stripe-webhook-instance-ids.log')
        appendFileSync(idLogPath, JSON.stringify({ ts: new Date().toISOString(), instanceId, eventId: (() => { try { return JSON.parse(body)?.id } catch { return null } })() }) + '\n')
      } catch (e) {
        console.warn('[webhook] failed to write instance id marker:', e)
      }
      // Compute and return lightweight HMAC debug info (do not expose secret)
      // so the caller can immediately correlate what header was received and
      // what this instance computed for the same timestamp+body.
      try {
        const sigHeader = sig
        const parts = String(sigHeader).split(',').map(s => s.trim())
        const tPart = parts.find(p => p.startsWith('t='))
        const v1Part = parts.find(p => p.startsWith('v1='))
        const parsedTimestamp = tPart ? tPart.split('=')[1] : null
        const receivedV1 = v1Part ? v1Part.split('=')[1] : null
        let computedV1: string | null = null
        try {
          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
          if (webhookSecret && parsedTimestamp) {
            computedV1 = crypto.createHmac('sha256', String(webhookSecret)).update(`${parsedTimestamp}.${body}`).digest('hex')
          }
        } catch (e) {
          // best-effort; do not block response on debug calculation
          console.warn('[webhook] failed to compute debug HMAC:', e)
        }
        return NextResponse.json({ received: true, instanceId, debug: { parsed_timestamp: parsedTimestamp, received_v1: receivedV1, computed_v1: computedV1 } })
      } catch (e) {
        return NextResponse.json({ received: true, instanceId })
      }
    } catch (e) {
      // If UUID import or write fails, fall back to simple response indicating
      // reception. Do not block normal processing.
      console.warn('[webhook] instance-id debug failed:', e)
      return NextResponse.json({ received: true })
    }

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