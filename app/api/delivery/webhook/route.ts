import { NextResponse } from 'next/server'
import { yamatoProvider } from '../../../../lib/delivery/providers/yamato'
import { japanPostProvider } from '../../../../lib/delivery/providers/japanpost'

const providers = [yamatoProvider, japanPostProvider]

export async function POST(req: Request) {
  // Read raw body for signature verification
  const bodyText = await req.text()
  const headersObj: Record<string,string> = {}
  for (const [k, v] of req.headers) headersObj[k] = v ?? ''

  // Simple provider detection by known signature header
  let provider = providers.find(p => headersObj['x-yamato-signature'] && p.id === 'yamato')
  if (!provider && headersObj['x-japanpost-signature']) provider = providers.find(p => p.id === 'japanpost')
  if (!provider) return NextResponse.json({ error: 'unknown provider' }, { status: 400 })

  try {
    const ok = await provider.verifyWebhook(headersObj, bodyText)
    if (!ok) return NextResponse.json({ error: 'signature mismatch' }, { status: 403 })
    let parsed: any = null
    try { parsed = JSON.parse(bodyText) } catch { parsed = bodyText }
    await provider.handleWebhookEvent(parsed)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
