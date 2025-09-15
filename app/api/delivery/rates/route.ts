import { NextResponse } from 'next/server'
import { yamatoProvider } from '../../../../lib/delivery/providers/yamato'
import { japanPostProvider } from '../../../../lib/delivery/providers/japanpost'

const providers = [yamatoProvider, japanPostProvider]

export async function POST(req: Request) {
  const body = await req.json()
  const { origin, destination, weightGrams } = body
  if (!origin || !destination) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

  const results = [] as any[]
  for (const p of providers) {
    try {
      const rates = await p.getRates({ origin, destination, weightGrams })
      results.push(...rates)
    } catch (e) {
      // ignore provider errors
    }
  }

  return NextResponse.json({ ok: true, rates: results })
}
