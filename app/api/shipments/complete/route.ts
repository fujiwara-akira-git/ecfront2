import { NextResponse } from 'next/server'
import { patchDoc } from '../../../../lib/firestoreRest'

export async function POST(req: Request) {
  const body = await req.json()
  // Expect body: { shipmentId, completedAt }
  if (!body || !body.shipmentId) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

  try {
    const update = { status: 'completed', completedAt: body.completedAt || new Date().toISOString() }
    await patchDoc('shipments', body.shipmentId, update)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'failed', detail: String(err) }, { status: 500 })
  }
}
