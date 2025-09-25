import { NextResponse } from 'next/server'

// Dev-only route to invoke the Stripe webhook handler in-process using a saved event payload.
// This bypasses signature verification and must NOT be enabled in production.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let payload: any
  try {
    payload = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'invalid_json', detail: String(e) }, { status: 400 })
  }

  try {
  // import inside handler so this file is safe to exist but does nothing in prod
  // use a dynamic import; Next will transpile TypeScript appropriately at runtime
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const mod: any = await import('../../../../lib/providers/stripe')
  const stripeProvider = mod.stripeProvider || (mod.default && mod.default.stripeProvider) || mod.default?.stripeProvider
    if (!stripeProvider || typeof stripeProvider.handleWebhookEvent !== 'function') {
      return NextResponse.json({ error: 'stripeProvider_not_found' }, { status: 500 })
    }

    await stripeProvider.handleWebhookEvent(payload)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    try {
      // attempt to capture any debug file written by the provider
      return NextResponse.json({ error: 'handler_error', detail: String(err.message || err) }, { status: 500 })
    } catch (e) {
      return NextResponse.json({ error: 'handler_error', detail: String(err) }, { status: 500 })
    }
  }
}
