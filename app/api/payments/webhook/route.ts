import { NextResponse } from 'next/server'
import { getPaymentProvider } from '@/lib/providers'
import fs from 'fs'
import path from 'path'

const LOG_PATH = path.resolve(process.cwd(), 'tmp/stripe-webhook-logs.jsonl')

function appendDebugLog(obj: any) {
  try {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true })
    fs.appendFileSync(LOG_PATH, JSON.stringify(obj) + '\n', { encoding: 'utf8' })
  } catch (e) {
    // best-effort logging — don't throw
    console.error('[payments/webhook] failed to append debug log', e)
  }
}

export async function POST(req: Request) {
  try {
    // collect headers as plain object for provider.verifyWebhook
    const headersObj: Record<string, string> = {}
    for (const [k, v] of req.headers) {
      const val = v as string | string[] | undefined
      headersObj[k] = typeof val === 'string' ? (val ?? '') : Array.isArray(val) ? val.join(',') : String(val)
    }

    // try to obtain stripe signature header (case-insensitive)
    const signatureHeader =
      headersObj['stripe-signature'] ||
      headersObj['Stripe-Signature'] ||
      headersObj['stripe_signature'] ||
      headersObj['Stripe_Signature'] ||
      null

    // read raw body text (important for signature verification)
    const bodyText = await req.text()

    // debug: log header/signature and body length (trim body preview)
    const bodyPreview = (bodyText || '').slice(0, 1000) // avoid huge outputs
    console.log('[payments/webhook] received. signature:', signatureHeader)
    console.log('[payments/webhook] body length:', (bodyText || '').length)
    console.log('[payments/webhook] body preview:', bodyPreview)

    // write a best-effort debug record so we can inspect later even if verification fails
    appendDebugLog({
      ts: new Date().toISOString(),
      source: 'incoming',
      signature: signatureHeader,
      bodyLength: (bodyText || '').length,
      bodyPreview,
      headers: {
        // include only a few useful headers to avoid leaking too much
        'content-type': headersObj['content-type'] || null,
        'user-agent': headersObj['user-agent'] || null,
      },
    })

    const provider = getPaymentProvider()
    const verification = await provider.verifyWebhook(headersObj, bodyText)
    console.log('[payments/webhook] verification:', verification?.valid ? 'OK' : 'FAILED')

    if (!verification || !verification.valid) {
      console.error('[payments/webhook] signature verification failed')
      appendDebugLog({
        ts: new Date().toISOString(),
        source: 'verification-failed',
        signature: signatureHeader,
        reason: 'signature verification failed',
      })
      return NextResponse.json({ ok: false, error: 'signature verification failed' }, { status: 400 })
    }

    // call handler (may write logs / persist)
    try {
      await provider.handleWebhookEvent(verification.payload)
      appendDebugLog({
        ts: new Date().toISOString(),
        source: 'handler-success',
        event: verification.payload?.type || null,
        id: verification.payload?.id || null,
      })
    } catch (err) {
      console.error('[payments/webhook] handler error', err)
      appendDebugLog({
        ts: new Date().toISOString(),
        source: 'handler-error',
        error: String(err),
      })
      // return 500 to let Stripe retry; change to 200 if you prefer no retries
      return NextResponse.json({ ok: false, error: 'handler error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[payments/webhook] unexpected error', err)
    appendDebugLog({
      ts: new Date().toISOString(),
      source: 'unexpected-error',
      error: err?.message || String(err),
    })
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 })
  }
}